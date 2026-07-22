"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { ApiError } from "@/lib/contracts";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setFields({});
    setFormError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const body = await response.json() as ApiError | object;
      if (!response.ok) {
        const error = (body as ApiError).error;
        setFields(error.fields ?? {});
        setFormError(error.message);
        return;
      }
      router.replace("/planner");
      router.refresh();
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-form-shell">
      <header className="form-heading">
        <h2>{signup ? "Create an account" : "Sign in"}</h2>
        <span>{signup ? "Create a private account for your future term plans." : "Return to your schedule-planning account."}</span>
      </header>

      <form onSubmit={submit} aria-busy={pending}>
        {formError && <div className="form-alert" role="alert"><strong>Could not continue</strong><span>{formError}</span></div>}
        <div className="form-field">
          <label htmlFor={`${mode}-email`}>Email address</label>
          <input id={`${mode}-email`} name="email" type="email" autoComplete="email" inputMode="email" required disabled={pending} onChange={() => { setFields((current) => ({ ...current, email: "" })); setFormError(""); }} aria-invalid={Boolean(fields.email)} aria-describedby={fields.email ? `${mode}-email-error` : undefined} />
          {fields.email && <span className="field-error" id={`${mode}-email-error`}>{fields.email}</span>}
        </div>
        <div className="form-field">
          <div className="label-row">
            <label htmlFor={`${mode}-password`}>Password</label>
            {!signup && <Link href="/forgot-password">Forgot password?</Link>}
          </div>
          <div className="password-control"><input id={`${mode}-password`} name="password" type={showPassword ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 10 : 1} disabled={pending} onChange={() => { setFields((current) => ({ ...current, password: "" })); setFormError(""); }} aria-invalid={Boolean(fields.password)} aria-describedby={signup ? `${mode}-password-help${fields.password ? ` ${mode}-password-error` : ""}` : fields.password ? `${mode}-password-error` : undefined} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div>
          {signup && <span className="field-help" id={`${mode}-password-help`}>At least 10 characters with uppercase, lowercase, and a number.</span>}
          {fields.password && <span className="field-error" id={`${mode}-password-error`}>{fields.password}</span>}
        </div>
        <button className="primary-button" type="submit" disabled={pending}>{pending ? signup ? "Creating account…" : "Signing in…" : signup ? "Create account" : "Sign in"}</button>
      </form>

      <p className="auth-switch">{signup ? "Already have an account?" : "New to UDST Schedule?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create an account"}</Link></p>
    </div>
  );
}
