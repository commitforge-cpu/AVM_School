"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api, type ApiError } from "@/lib/api";
import type { UserView } from "@/lib/types";

export default function AccountsPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserView[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [role, setRole] = useState("All");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);

  const load = () => api<UserView[]>("/api/users").then(setUsers).catch((e: ApiError) => setMsg({ ok: false, text: e.message }));
  useEffect(() => { load(); }, []);

  async function setActive(u: UserView, active: boolean) {
    try {
      const r = await api<UserView>(`/api/users/${u.id}/active?active=${active}`, { method: "PATCH" });
      setUsers((all) => all?.map((x) => (x.id === r.id ? r : x)) ?? null);
    } catch (e) { setMsg({ ok: false, text: (e as ApiError).message }); }
  }

  async function resetPassword(u: UserView) {
    const pw = window.prompt(`New password for ${u.email} (at least 8 characters):`);
    if (pw === null) return;
    if (pw.length < 8) { setMsg({ ok: false, text: "The password must be at least 8 characters." }); return; }
    try {
      await api(`/api/users/${u.id}/reset-password`, { body: { newPassword: pw } });
      setMsg({ ok: true, text: `Password changed for ${u.email}. Share it with them securely.` });
    } catch (e) { setMsg({ ok: false, text: (e as ApiError).message }); }
  }

  async function addAdmin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/users/admin", { body: { ...form, phone: form.phone || null } });
      setForm({ fullName: "", email: "", phone: "", password: "" });
      setMsg({ ok: true, text: "Admin account created." });
      load();
    } catch (err) { setMsg({ ok: false, text: (err as ApiError).message }); } finally { setBusy(false); }
  }

  const shown = (users ?? []).filter((u) => role === "All" || u.role === role);

  return (
    <>
      <div className="admin-head"><div><h1>Accounts</h1><p className="muted">Login accounts for parents and staff. Deactivated accounts can&apos;t log in.</p></div></div>
      {msg && <div className={`alert ${msg.ok ? "alert-ok" : "alert-error"}`} role="status">{msg.text}</div>}

      <div className="box">
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>All accounts</h2>
          <select className="input" aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)} style={{ maxWidth: 200 }}>
            <option>All</option><option>Admin</option><option>Student</option>
          </select>
        </div>
        {!users ? <p className="muted">Loading…</p> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last login</th><th>Status</th><th /></tr></thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.id}>
                    <td>{u.fullName}</td>
                    <td>{u.email}{u.phone && <><br /><span className="muted">{u.phone}</span></>}</td>
                    <td>{u.role}</td>
                    <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-IN") : <span className="muted">Never</span>}</td>
                    <td>{u.isActive ? "Active" : <span style={{ color: "var(--bad)" }}>Deactivated</span>}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn btn-quiet btn-sm" onClick={() => resetPassword(u)}>Set password</button>{" "}
                      {u.id !== me?.id && (
                        <button className={`btn btn-sm ${u.isActive ? "btn-danger" : "btn-quiet"}`} onClick={() => setActive(u, !u.isActive)}>
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form className="box" onSubmit={addAdmin}>
        <h2>Add an admin</h2>
        <div className="form-grid">
          <div className="field"><label htmlFor="na-name">Full name</label><input id="na-name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div className="field"><label htmlFor="na-email">Email</label><input id="na-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="field"><label htmlFor="na-phone">Phone</label><input id="na-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field"><label htmlFor="na-pw">Password</label><input id="na-pw" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={busy}>{busy ? "Creating…" : "Create admin"}</button>
      </form>
    </>
  );
}
