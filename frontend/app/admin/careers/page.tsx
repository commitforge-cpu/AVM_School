"use client";

import { useEffect, useState } from "react";
import { api, type ApiError } from "@/lib/api";
import type { CareerApplication } from "@/lib/types";

const STATUSES = ["New", "Shortlisted", "Interviewed", "Hired", "Not selected"];

export default function CareerApplicationsPage() {
  const [items, setItems] = useState<CareerApplication[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api<CareerApplication[]>("/api/careers").then(setItems).catch((e: ApiError) => setError(e.message)); }, []);

  async function setStatus(a: CareerApplication, status: string) {
    try {
      const u = await api<CareerApplication>(`/api/careers/${a.id}/status`, { method: "PATCH", body: { status } });
      setItems((all) => all?.map((x) => (x.id === u.id ? u : x)) ?? null);
    } catch (err) { setError((err as ApiError).message); }
  }

  async function remove(a: CareerApplication) {
    if (!window.confirm(`Delete the application from ${a.firstName} ${a.lastName}? This can't be undone.`)) return;
    try {
      await api(`/api/careers/${a.id}`, { method: "DELETE" });
      setItems((all) => all?.filter((x) => x.id !== a.id) ?? null);
    } catch (err) { setError((err as ApiError).message); }
  }

  return (
    <>
      <div className="admin-head"><div><h1>Career applications</h1><p className="muted">Applications sent from the Career page.</p></div></div>
      {error && <div className="alert alert-error">{error}</div>}
      {!items ? <p className="muted">Loading…</p> : items.length === 0 ? <div className="empty">No applications yet.</div> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Applicant</th><th>Position</th><th>CV</th><th>Received</th><th>Status</th><th /></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.firstName} {a.lastName}</strong><br /><a className="text-link" href={`mailto:${a.email}`}>{a.email}</a>{a.phone && <><br />{a.phone}</>}</td>
                  <td>{a.position}</td>
                  <td>{a.cvLink ? <a className="text-link" href={a.cvLink} target="_blank" rel="noreferrer noopener">Open</a> : <span className="muted">None</span>}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString("en-IN")}</td>
                  <td>
                    <select className="input" aria-label={`Status for ${a.firstName}`} value={a.status} onChange={(e) => setStatus(a, e.target.value)} style={{ minHeight: 36, padding: ".3rem .5rem" }}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => remove(a)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
