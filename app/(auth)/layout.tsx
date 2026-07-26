import Link from "next/link";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="auth-page">
      <section className="auth-workspace"><Link className="brand mobile-auth-brand" href="/login" aria-label="UDST Schedule sign in"><span className="brand-mark" aria-hidden="true">U</span><span>UDST Schedule</span></Link>{children}</section>
      <section className="auth-context" aria-labelledby="auth-context-title">
        <Link className="brand" href="/login" aria-label="UDST Schedule sign in">
          <span className="brand-mark" aria-hidden="true">U</span>
          <span>UDST Schedule</span>
        </Link>
        <div className="auth-context-copy">
          <h2 id="auth-context-title">Your courses stay tied to your evidence.</h2>
          <p>Every plan starts with the courses and screenshots you provide. Nothing unrelated is added to your schedule.</p>
        </div>
        <dl className="trust-list">
          <div><dt>Private account</dt><dd>Your plans belong only to you.</dd></div>
          <div><dt>Exact course set</dt><dd>One complete option for every course.</dd></div>
          <div><dt>PeopleSoft remains final</dt><dd>You review before registering.</dd></div>
        </dl>
      </section>
    </main>
  );
}
