"use client";

import { useEffect, useState } from "react";
import { api, type ApiError } from "@/lib/api";
import type { ContactEnquiry } from "@/lib/types";

export default function EnquiriesPage() {
  const [items, setItems] = useState<ContactEnquiry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api<ContactEnquiry[]>("/api/enquiries").then(setItems).catch((e: ApiError) => setError(e.message)); }, []);

  async function toggle(e: ContactEnquiry) {
    try {
      const u = await api<ContactEnquiry>(`/api/enquiries/${e.id}/read?read=${!e.isRead}`, { method: "PATCH" });
      setItems((all) => all?.map((x) => (x.id === u.id ? u : x)) ?? null);
    } catch (err) { setError((err as ApiError).message); }
  }

  async function remove(e: ContactEnquiry) {
    if (!window.confirm(`Delete the message from ${e.name}? This can't be undone.`)) return;
    try {
      await api(`/api/enquiries/${e.id}`, { method: "DELETE" });
      setItems((all) => all?.filter((x) => x.id !== e.id) ?? null);
    } catch (err) { setError((err as ApiError).message); }
  }

  return (
    <>
      <div className="admin-head"><div><h1>Enquiries</h1><p className="muted">Messages sent from the Connect page. Unread messages are marked on the left.</p></div></div>
      {error && <div className="alert alert-error">{error}</div>}
      {!items ? <p className="muted">Loading…</p> : items.length === 0 ? <div className="empty">No messages yet.</div> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>From</th><th>Message</th><th>Received</th><th /></tr></thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} data-unread={!e.isRead}>
                  <td>
                    <strong>{e.name}</strong><br />
                    <a className="text-link" href={`mailto:${e.email}?subject=${encodeURIComponent("Your enquiry to AVM School")}`}>{e.email}</a>
                    {e.phone && <><br /><a href={`tel:${e.phone}`}>{e.phone}</a></>}
                  </td>
                  <td style={{ maxWidth: 520, whiteSpace: "pre-wrap" }}>{e.message}</td>
                  <td>{new Date(e.createdAt).toLocaleString("en-IN")}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn btn-quiet btn-sm" onClick={() => toggle(e)}>{e.isRead ? "Mark unread" : "Mark read"}</button>{" "}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(e)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
