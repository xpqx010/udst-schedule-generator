"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import type { ApiError, AuthResponse, CurrentUser } from "@/lib/contracts";

export function PlannerShell() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"loading" | "redirecting" | "ready" | "error">("loading");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) {
          setStatus("redirecting");
          startTransition(() => router.replace("/login"));
          return;
        }
        const body = await response.json().catch(() => null) as AuthResponse | ApiError | null;
        if (!body) throw new Error("The account service returned an unreadable response.");
        if (!response.ok) throw new Error((body as ApiError).error.message);
        setUser((body as AuthResponse).user);
        setStatus("ready");
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setError(loadError instanceof Error ? loadError.message : "Could not load your account.");
          setStatus("error");
        }
      }
    }
    loadUser();
    return () => controller.abort();
  }, [router]);

  async function logout() {
    setSigningOut(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as ApiError | null;
        throw new Error(body?.error.message || "The sign-out service is unavailable.");
      }
      startTransition(() => router.replace("/login"));
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Could not sign out. Try again.");
      setSigningOut(false);
    }
  }

  if (status === "loading") return <main className="session-state" aria-busy="true"><span className="brand-mark" aria-hidden="true">U</span><p role="status" aria-live="polite">Opening your planning workspace…</p></main>;
  if (status === "redirecting") return <main className="session-state"><span className="brand-mark" aria-hidden="true">U</span><p role="status">Your session ended. Taking you to sign in…</p></main>;
  if (status === "error" || !user) return <main className="session-state"><div className="form-alert" role="alert"><strong>Could not open your workspace</strong><span>{error || "The account service is unavailable."}</span></div><div className="session-actions"><button className="secondary-button" onClick={() => window.location.reload()}>Retry account check</button><button className="quiet-button" onClick={() => router.replace("/login")}>Return to sign in</button></div></main>;

  return <div className="planner-page">
    <header className="planner-header">
      <a className="brand" href="/planner"><span className="brand-mark" aria-hidden="true">U</span><span>UDST Schedule</span></a>
      <div className="account-actions"><span>{user.email}</span><button className="quiet-button" type="button" onClick={logout} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button></div>
    </header>
    <main className="planner-main">
      {error && <div className="form-alert inline-alert" role="alert"><strong>Account action failed</strong><span>{error}</span></div>}
      <section className="planner-intro" aria-labelledby="planner-title">
        <div><h1 id="planner-title">Your planning account is ready.</h1><p>You are signed in securely. Term plans and screenshot uploads will be added in the next feature.</p></div>
        <div className="term-stamp" aria-label="Current planning status"><span>Account ready</span><strong>Start with a term</strong><small>Course planning comes next</small></div>
      </section>
      <section className="next-feature" aria-labelledby="next-feature-title">
        <div><h2 id="next-feature-title">No course plans yet</h2><p>The next feature will let you create a term, add courses, and save every change through the plans API.</p></div>
        <span className="feature-status">Not built yet</span>
      </section>
      <section className="account-record" aria-labelledby="account-record-title">
        <h2 id="account-record-title">Account record</h2>
        <dl><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Created</dt><dd>{new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(user.createdAt))}</dd></div><div><dt>Account protection</dt><dd>Every future plan request will require your signed-in account.</dd></div></dl>
      </section>
    </main>
    <footer className="planner-footer">Planning only · Registration remains in PeopleSoft</footer>
  </div>;
}
