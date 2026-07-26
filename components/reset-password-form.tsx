"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { ApiError } from "@/lib/contracts";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true); setError(""); setFieldError("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password: form.get("password") }) });
      const body = await response.json() as Partial<ApiError>;
      if (!response.ok) {
        setError(body.error?.message ?? "We could not reset your password.");
        setFieldError(body.error?.fields?.password ?? "");
        return;
      }
      router.replace("/planner");
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally { setPending(false); }
  }

  if (!token) return <div className="auth-form-shell"><header className="form-heading"><p>Account recovery</p><h1>Reset link missing</h1><span>This page needs the complete link from your reset email.</span></header><div className="form-alert" role="alert"><strong>Request a new link</strong><span>The reset token is missing.</span></div><p className="auth-switch"><Link href="/forgot-password">Request another reset link</Link></p></div>;

  return <div className="auth-form-shell">
    <header className="form-heading"><h1>Choose a new password</h1><span>Using a new password signs out any previous sessions.</span></header>
    <form onSubmit={submit} aria-busy={pending}>
      {error && <div className="form-alert" role="alert"><strong>Could not reset password</strong><span>{error}</span></div>}
      <div className="form-field"><label htmlFor="new-password">New password</label><div className="password-control"><input id="new-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={10} disabled={pending} onChange={() => { setFieldError(""); setError(""); }} aria-invalid={Boolean(fieldError)} aria-describedby={`new-password-help${fieldError ? " new-password-error" : ""}`} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div><span className="field-help" id="new-password-help">At least 10 characters with uppercase, lowercase, and a number.</span>{fieldError && <span className="field-error" id="new-password-error">{fieldError}</span>}</div>
      <button className="primary-button" type="submit" disabled={pending}>{pending ? "Updating…" : "Set new password"}</button>
    </form>
    <p className="auth-switch"><Link href="/forgot-password">Request a new link</Link> · <Link href="/login">Return to sign in</Link></p>
  </div>;
}
