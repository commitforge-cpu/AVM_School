"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { api, type ApiError } from "@/lib/api";
import { assetUrl } from "@/lib/config";
import type { GalleryPhoto } from "@/lib/types";

const SUGGESTED = ["Events", "Sports", "Annual Day", "Awards", "Campus", "Beanstalk", "Arts", "General"];

function PhotoCard({ photo, onSaved, onDeleted, onError }: {
  photo: GalleryPhoto;
  onSaved: (p: GalleryPhoto) => void; onDeleted: (id: number) => void; onError: (m: string) => void;
}) {
  const [p, setP] = useState(photo);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(p) !== JSON.stringify(photo);

  async function save() {
    setBusy(true);
    try {
      onSaved(await api<GalleryPhoto>(`/api/gallery/${p.id}`, {
        method: "PUT",
        body: { title: p.title, description: p.description, category: p.category, sortOrder: Number(p.sortOrder) || 0, isPublished: p.isPublished },
      }));
    } catch (e) { onError((e as ApiError).message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm(`Delete "${p.title}"? The file is removed from the Gallery folder and can't be recovered.`)) return;
    try { await api(`/api/gallery/${p.id}`, { method: "DELETE" }); onDeleted(p.id); }
    catch (e) { onError((e as ApiError).message); }
  }

  return (
    <div className="admin-photo" data-hidden={!p.isPublished}>
      <a href={assetUrl(p.url)} target="_blank" rel="noreferrer"><img src={assetUrl(p.url)} alt={p.title} loading="lazy" /></a>
      <div className="body">
        <input className="input" aria-label="Title" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} />
        <input className="input" aria-label="Category" list="gallery-cats" value={p.category} onChange={(e) => setP({ ...p, category: e.target.value })} />
        <input className="input" aria-label="Description" placeholder="Description (optional)" value={p.description ?? ""} onChange={(e) => setP({ ...p, description: e.target.value })} />
        <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
          <label className="check" style={{ fontWeight: 400, fontSize: ".92rem" }}>
            <input type="checkbox" checked={p.isPublished} onChange={(e) => setP({ ...p, isPublished: e.target.checked })} /> Show on website
          </label>
          <input className="input" aria-label="Order" type="number" title="Order (lower shows first)" style={{ width: 72, marginLeft: "auto" }}
            value={p.sortOrder} onChange={(e) => setP({ ...p, sortOrder: Number(e.target.value) })} />
        </div>
        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || busy}>{busy ? "Saving…" : "Save"}</button>
          <button className="btn btn-quiet btn-sm" onClick={() => navigator.clipboard?.writeText(assetUrl(p.url))} title="Copy the image link to use in Page content">Copy link</button>
          <button className="btn btn-danger btn-sm" onClick={remove}>Delete</button>
        </div>
        <small className="muted">{p.fileName} ({Math.round(p.fileSizeBytes / 1024)} KB)</small>
      </div>
    </div>
  );
}

export default function AdminGalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Events");
  const [description, setDescription] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState("All");
  const input = useRef<HTMLInputElement>(null);

  const load = () => api<GalleryPhoto[]>("/api/gallery/all").then(setPhotos).catch((e: ApiError) => setMsg({ ok: false, text: e.message }));
  useEffect(() => { load(); }, []);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  function choose(list: FileList | null) {
    const picked = Array.from(list ?? []).filter((f) => /^image\/(jpeg|png|webp|gif)$/.test(f.type));
    setFiles(picked);
    setPreviews(picked.map((f) => URL.createObjectURL(f)));
  }

  function drop(e: DragEvent) { e.preventDefault(); setOver(false); choose(e.dataTransfer.files); }

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!files.length) { setMsg({ ok: false, text: "Choose at least one photo." }); return; }
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    if (title.trim()) fd.append("title", title.trim());
    fd.append("category", category.trim() || "General");
    if (description.trim()) fd.append("description", description.trim());
    setBusy(true);
    try {
      const res = await api<{ created: GalleryPhoto[]; errors: string[] }>("/api/gallery", { form: fd });
      setMsg({
        ok: res.errors.length === 0,
        text: `Uploaded ${res.created.length} photo${res.created.length === 1 ? "" : "s"} to the Gallery folder.` + (res.errors.length ? ` Skipped: ${res.errors.join(" ")}` : ""),
      });
      setFiles([]); setPreviews([]); setTitle(""); setDescription("");
      if (input.current) input.current.value = "";
      load();
    } catch (err) { setMsg({ ok: false, text: (err as ApiError).message }); } finally { setBusy(false); }
  }

  async function sync() {
    try {
      const r = await api<{ added: number; removed: number }>("/api/gallery/sync", { method: "POST" });
      setMsg({ ok: true, text: `Folder checked: ${r.added} new photo(s) added, ${r.removed} missing photo(s) removed.` });
      load();
    } catch (err) { setMsg({ ok: false, text: (err as ApiError).message }); }
  }

  const categories = Array.from(new Set([...SUGGESTED, ...(photos ?? []).map((p) => p.category)]));
  const shown = (photos ?? []).filter((p) => filter === "All" || p.category === filter);

  return (
    <>
      <div className="admin-head">
        <div><h1>Gallery</h1><p className="muted">Photos are saved in the API&apos;s <code>Gallery</code> folder and appear on the public Gallery page.</p></div>
        <button className="btn btn-quiet btn-sm" onClick={sync} title="Add photos copied straight into the Gallery folder">Check Gallery folder</button>
      </div>

      {msg && <div className={`alert ${msg.ok ? "alert-ok" : "alert-error"}`} role="status">{msg.text}</div>}
      <datalist id="gallery-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>

      <form className="box" onSubmit={upload}>
        <h2>Add photos</h2>
        <div
          className="dropzone" data-over={over} role="button" tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
        >
          <strong>Drop photos here or click to choose</strong>
          <p className="muted">JPG, PNG, WEBP or GIF, up to 10 MB each. You can add several at once.</p>
          <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => choose(e.target.files)} />
          {previews.length > 0 && <div className="previews">{previews.map((src) => <img key={src} src={src} alt="" />)}</div>}
        </div>
        <div className="form-grid" style={{ marginTop: "1rem" }}>
          <div className="field"><label htmlFor="g-title">Title</label><input id="g-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Uses the file name if empty" /></div>
          <div className="field"><label htmlFor="g-cat">Category</label><input id="g-cat" list="gallery-cats" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div className="field wide"><label htmlFor="g-desc">Description</label><input id="g-desc" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={busy || !files.length}>
          {busy ? "Uploading…" : files.length ? `Upload ${files.length} photo${files.length === 1 ? "" : "s"}` : "Upload photos"}
        </button>
      </form>

      <div className="box">
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>All photos ({photos?.length ?? 0})</h2>
          <select className="input" aria-label="Filter by category" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 220 }}>
            <option>All</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {!photos ? <p className="muted">Loading…</p> : shown.length === 0 ? <div className="empty">No photos here yet. Add some above.</div> : (
          <div className="admin-gallery">
            {shown.map((p) => (
              <PhotoCard key={`${p.id}-${p.title}-${p.category}-${p.sortOrder}-${p.isPublished}`} photo={p}
                onSaved={(u) => { setPhotos((all) => all?.map((x) => (x.id === u.id ? u : x)) ?? null); setMsg({ ok: true, text: "Photo saved." }); }}
                onDeleted={(id) => { setPhotos((all) => all?.filter((x) => x.id !== id) ?? null); setMsg({ ok: true, text: "Photo deleted." }); }}
                onError={(m) => setMsg({ ok: false, text: m })} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
