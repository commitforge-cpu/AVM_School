"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import JsonEditor, { type Json } from "@/components/JsonEditor";
import { api, ApiError } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import { contentPages, defaults, type ContentKey } from "@/lib/defaultContent";
import { mergeContent } from "@/lib/merge";

type Doc = Record<string, Json>;

export default function AdminContentPage() {
  const [key, setKey] = useState<ContentKey>("home");
  const [doc, setDoc] = useState<Doc | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const dirty = doc !== null && JSON.stringify(doc) !== saved;

  const load = useCallback(async (k: ContentKey) => {
    setDoc(null); setRaw(null); setMsg(null);
    const base = defaults[k] as unknown as Doc;
    try {
      const r = await api<{ data: Doc; updatedAt: string }>(`/api/content/${k}`);
      const merged = mergeContent(base, r.data);
      setDoc(merged); setSaved(JSON.stringify(merged)); setUpdatedAt(r.updatedAt);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setDoc(base); setSaved(JSON.stringify(base)); setUpdatedAt(null);
      } else {
        setMsg({ ok: false, text: (e as Error).message });
      }
    }
  }, []);

  useEffect(() => { load(key); }, [key, load]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function pick(k: ContentKey) {
    if (k === key) return;
    if (dirty && !window.confirm("You have unsaved changes on this page. Leave without saving?")) return;
    setKey(k);
  }

  async function save() {
    let data = doc;
    if (raw !== null) {
      try { data = JSON.parse(raw); } catch { setMsg({ ok: false, text: "The JSON isn't valid. Check for missing commas or quotes." }); return; }
    }
    setBusy(true);
    try {
      const r = await api<{ data: Doc; updatedAt: string }>(`/api/content/${key}`, { method: "PUT", body: data });
      setDoc(r.data); setSaved(JSON.stringify(r.data)); setUpdatedAt(r.updatedAt); setRaw(null);
      setMsg({ ok: true, text: "Saved. The website shows the new content now." });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  }

  async function reset() {
    if (!window.confirm("Go back to the original text for this page? Your saved changes for this page will be removed.")) return;
    try {
      await api(`/api/content/${key}`, { method: "DELETE" });
      await load(key);
      setMsg({ ok: true, text: "This page now shows its original text." });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }

  const page = contentPages.find((p) => p.key === key)!;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Page content</h1>
          <p className="muted">Edit the text, links and images on the website. Start with the home (index) page.</p>
        </div>
        <Link className="btn btn-quiet btn-sm" href={page.path} target="_blank">View {page.label.split(" (")[0].toLowerCase()} page</Link>
      </div>

      <div className="page-tabs" role="group" aria-label="Choose a page">
        {contentPages.map((p) => (
          <button key={p.key} aria-pressed={key === p.key} onClick={() => pick(p.key)}>{p.label}</button>
        ))}
      </div>

      {msg && <div className={`alert ${msg.ok ? "alert-ok" : "alert-error"}`} role="status">{msg.text}</div>}
      <p className="muted" style={{ marginBottom: "1rem" }}>
        {updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString("en-IN")}.` : "Showing the original text. Nothing saved for this page yet."}
        {" "}To use a gallery photo, open Admin → Gallery, click <em>Copy link</em> and paste it into an image URL field.
      </p>

      {!doc ? <p className="muted">Loading…</p> : raw !== null ? (
        <div className="field">
          <label htmlFor="raw-json">JSON for this page</label>
          <textarea id="raw-json" value={raw} onChange={(e) => setRaw(e.target.value)} rows={28} style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: ".85rem" }} />
        </div>
      ) : (
        <JsonEditor value={doc} onChange={setDoc} resolveUrl={assetUrl} />
      )}

      <div className="sticky-save">
        <button className="btn btn-primary" onClick={save} disabled={busy || (!dirty && raw === null)}>{busy ? "Saving…" : "Save changes"}</button>
        <button className="btn btn-quiet" onClick={() => setRaw(raw === null ? JSON.stringify(doc, null, 2) : null)} disabled={!doc}>
          {raw === null ? "Edit as JSON" : "Back to form"}
        </button>
        {updatedAt && <button className="btn btn-danger" onClick={reset}>Restore original text</button>}
        {dirty && <span className="muted">Unsaved changes</span>}
      </div>
    </>
  );
}
