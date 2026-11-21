"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import type { ApiError } from "@/lib/api";
import type { Role } from "@/lib/types";

export default function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [role, setRole] = useState<Role>(params.get("as") === "admin" ? "Admin" : "Student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(user.role === "Admin" ? "/admin" : "/dashboard");
  }, [loading, user, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setBusy(true);
    try {
      const u = await login(email.trim(), password, role);
      router.push(u.role === "Admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 style={{ fontSize: "var(--t-2xl)", marginBottom: ".4rem" }}>Log in</h1>
      <p className="muted" style={{ marginBottom: "1.5rem" }}>
        {role === "Student" ? "Parents and students: see your application and its status." : "School staff: manage students, the gallery and page content."}
      </p>

      <div className="tabs" role="tablist" aria-label="Account type">
        {(["Student", "Admin"] as Role[]).map((r) => (
          <button key={r} role="tab" type="button" aria-selected={role === r} onClick={() => { setRole(r); setError(""); }}>
            {r === "Student" ? "Student" : "Admin"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} noValidate>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="field" style={{ marginBottom: "1rem" }}>
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <div style={{ position: "relative" }}>
            <input id="login-password" type={show ? "text" : "password"} autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: "4.5rem" }} />
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShow((s) => !s)}
              style={{ position: "absolute", right: 5, top: 5, minHeight: 36 }} aria-pressed={show}>
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: "100%", marginTop: "1.5rem" }} disabled={busy}>
          {busy ? "Logging in…" : role === "Admin" ? "Log in as admin" : "Log in"}
        </button>
      </form>

      {role === "Student" && (
        <p className="muted" style={{ marginTop: "1.4rem", textAlign: "center" }}>
          New to AVM? <Link className="text-link" href="/register">Register a student</Link>
        </p>
      )}
      {role === "Admin" && (
        <p className="muted" style={{ marginTop: "1.4rem", textAlign: "center", fontSize: ".92rem" }}>
          Forgot the admin password? Another admin can reset it from Admin → Accounts.
        </p>
      )}
    </>
  );
}
