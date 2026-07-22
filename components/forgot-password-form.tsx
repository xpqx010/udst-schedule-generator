"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { ApiError } from "@/lib/contracts";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true); setError(""); setFieldError(""); setMessage(""); setPreviewUrl("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email") }) });
      const body = await response.json() as { message?: string; previewUrl?: string } & Partial<ApiError>;
      if (!response.ok) {
        setError(body.error?.message ?? "We could not send a reset link.");
        setFieldError(body.error?.fields?.email ?? "");
        return;
      }
      setMessage(body.message ?? "Check your email for a reset link.");
      setPreviewUrl(body.previewUrl ?? "");
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally { setPending(false); }
  }

  return <div className="auth-form-shell">
    <header className="form-heading"><h2>Request a reset link</h2><span>Enter your account email. Reset links expire after 30 minutes.</span></header>
    {message ? <><div className="success-panel" role="status"><strong>Check your email</strong><span>{message}</span>{previewUrl && process.env.NODE_ENV !== "production" && <Link href={previewUrl}>Open development reset link</Link>}</div><button className="secondary-button recovery-secondary" type="button" onClick={() => setMessage("")}>Use another email</button></> : <form onSubmit={submit} aria-busy={pending}>
      {error && <div className="form-alert" role="alert"><strong>Could not send the link</strong><span>{error}</span></div>}
      <div className="form-field"><label htmlFor="recovery-email">Email address</label><input id="recovery-email" name="email" type="email" autoComplete="email" required disabled={pending} onChange={() => { setFieldError(""); setError(""); }} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? "recovery-email-error" : undefined} />{fieldError && <span className="field-error" id="recovery-email-error">{fieldError}</span>}</div>
      <button className="primary-button" type="submit" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    </form>}
    <p className="auth-switch"><Link href="/login">Return to sign in</Link></p>
  </div>;
}
