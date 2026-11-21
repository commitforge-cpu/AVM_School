import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth-shell">
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "var(--t-3xl)" }}>Page not found</h1>
        <p className="muted" style={{ margin: "1rem 0 1.5rem" }}>The page you&apos;re looking for has moved or doesn&apos;t exist.</p>
        <Link className="btn btn-primary" href="/">Go to the home page</Link>
      </div>
    </div>
  );
}
