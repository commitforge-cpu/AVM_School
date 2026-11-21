"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Field from "@/components/Field";
import { api, apiObjectUrl, type ApiError } from "@/lib/api";
import { STUDENT_GROUPS, validateField } from "@/lib/studentFields";
import { ADMISSION_STATUSES, type Student, type StudentRow } from "@/lib/types";

type Values = Record<string, string | boolean>;

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [row, setRow] = useState<StudentRow | null>(null);
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  function load(r: StudentRow) {
    setRow(r);
    const v: Values = {};
    for (const g of STUDENT_GROUPS) for (const f of g.fields) {
      const raw = r.student[f.name];
      v[f.name] = f.type === "checkbox" ? Boolean(raw) : raw == null ? "" : String(raw);
    }
    v.admissionStatus = r.student.admissionStatus;
    v.adminRemarks = r.student.adminRemarks ?? "";
    v.accountEmail = r.account?.email ?? "";
    v.accountPhone = r.account?.phone ?? "";
    setValues(v);
  }

  useEffect(() => {
    api<StudentRow>(`/api/students/${id}`).then(load).catch((e: ApiError) => setMsg({ ok: false, text: e.message }));
  }, [id]);

  useEffect(() => {
    if (!row?.student.photoFileName) { setPhoto(null); return; }
    let url: string | null = null;
    apiObjectUrl(`/api/students/${row.student.id}/photo`).then((u) => { url = u; setPhoto(u); });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [row?.student.id, row?.student.photoFileName]);

  const set = (name: string, v: string | boolean) => setValues((s) => ({ ...s, [name]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    for (const g of STUDENT_GROUPS) for (const f of g.fields) {
      const m = f.name === "dateOfBirth" ? (values[f.name] ? undefined : "Date of birth is required.") : validateField(f, values[f.name]);
      if (m) errs[f.name] = m;
    }
    setErrors(errs);
    if (Object.keys(errs).length) { setMsg({ ok: false, text: "Fix the highlighted fields." }); return; }

    const body = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === "string" ? (v.trim() || null) : v]));
    setBusy(true);
    try {
      const r = await api<StudentRow>(`/api/students/${id}`, { method: "PUT", body });
      load(r);
      setMsg({ ok: true, text: "Changes saved." });
    } catch (err) {
      const a = err as ApiError;
      const mapped: Record<string, string> = {};
      for (const [k, m] of Object.entries(a.fieldErrors)) mapped[k.charAt(0).toLowerCase() + k.slice(1)] = m[0];
      setErrors(mapped);
      setMsg({ ok: false, text: a.message });
    } finally {
      setBusy(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function remove() {
    if (!row) return;
    if (!window.confirm(`Delete ${row.student.firstName} ${row.student.lastName} (${row.student.applicationNo})? This also deletes the parent's login account and photo, and can't be undone.`)) return;
    try {
      await api(`/api/students/${id}`, { method: "DELETE" });
      router.push("/admin/students");
    } catch (err) { setMsg({ ok: false, text: (err as ApiError).message }); }
  }

  async function replacePhoto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("photo", f);
    try {
      const s = await api<Student>(`/api/students/${id}/photo`, { form: fd });
      setRow((r) => (r ? { ...r, student: s } : r));
      setMsg({ ok: true, text: "Photo updated." });
    } catch (err) { setMsg({ ok: false, text: (err as ApiError).message }); }
  }

  if (!row) return msg ? <div className="alert alert-error">{msg.text}</div> : <p className="muted">Loading…</p>;
  const s = row.student;

  return (
    <form onSubmit={save} noValidate>
      <p><Link className="text-link" href="/admin/students">All students</Link></p>
      <div className="admin-head" style={{ marginTop: ".8rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {photo ? <img src={photo} alt="" style={{ width: 72, height: 90, objectFit: "cover", borderRadius: 8 }} /> : null}
          <div>
            <h1>{String(s.firstName)} {String(s.lastName)}</h1>
            <p className="muted">Application {s.applicationNo}, registered {new Date(s.createdAt).toLocaleString("en-IN")}</p>
          </div>
        </div>
        <label className="btn btn-quiet btn-sm" style={{ cursor: "pointer" }}>
          {s.photoFileName ? "Replace photo" : "Add photo"}
          <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif" onChange={replacePhoto} />
        </label>
      </div>

      {msg && <div className={`alert ${msg.ok ? "alert-ok" : "alert-error"}`} role="status">{msg.text}</div>}

      <div className="box">
        <h2>Admission decision</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="st-status">Status</label>
            <select id="st-status" value={String(values.admissionStatus ?? "")} onChange={(e) => set("admissionStatus", e.target.value)}>
              {ADMISSION_STATUSES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field wide">
            <label htmlFor="st-remarks">Remarks (the parent sees these)</label>
            <textarea id="st-remarks" maxLength={1000} value={String(values.adminRemarks ?? "")} onChange={(e) => set("adminRemarks", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="box">
        <h2>Login account</h2>
        <div className="form-grid">
          <div className="field"><label htmlFor="st-email">Email</label><input id="st-email" type="email" value={String(values.accountEmail ?? "")} onChange={(e) => set("accountEmail", e.target.value)} aria-invalid={errors.accountEmail ? true : undefined} />{errors.accountEmail && <span className="error">{errors.accountEmail}</span>}</div>
          <div className="field"><label htmlFor="st-phone">Mobile</label><input id="st-phone" type="tel" value={String(values.accountPhone ?? "")} onChange={(e) => set("accountPhone", e.target.value)} /></div>
        </div>
      </div>

      {STUDENT_GROUPS.map((g) => (
        <div className="box" key={g.id}>
          <h2>{g.title}</h2>
          <div className="form-grid">
            {g.fields.map((f) => (
              <Field key={f.name} def={f} idPrefix="adm" value={values[f.name]} error={errors[f.name]} onChange={set} />
            ))}
          </div>
        </div>
      ))}

      <div className="sticky-save">
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        <button type="button" className="btn btn-danger" onClick={remove}>Delete student</button>
      </div>
    </form>
  );
}
