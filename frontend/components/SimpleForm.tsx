"use client";

import { useState, type FormEvent } from "react";
import Field from "./Field";
import { api, ApiError } from "@/lib/api";
import { validateField, type FieldDef } from "@/lib/studentFields";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+\-\s]{10,15}$/;

// Field lists live here (client side) because RegExp rules can't be passed from server components.
function fieldsFor(kind: "contact" | "career", positions: string[]): FieldDef[] {
  if (kind === "contact")
    return [
      { name: "name", label: "Name", type: "text", required: true, maxLength: 120 },
      { name: "phone", label: "Phone", type: "tel", pattern: PHONE, patternMessage: "Enter a valid phone number." },
      { name: "email", label: "Email", type: "email", required: true, wide: true, maxLength: 150, pattern: EMAIL, patternMessage: "Enter a valid email address." },
      { name: "message", label: "Message", type: "textarea", required: true, wide: true, maxLength: 2000 },
    ];
  return [
    { name: "firstName", label: "First name", type: "text", required: true, maxLength: 60 },
    { name: "lastName", label: "Last name", type: "text", required: true, maxLength: 60 },
    { name: "email", label: "Email", type: "email", required: true, maxLength: 150, pattern: EMAIL, patternMessage: "Enter a valid email address." },
    { name: "phone", label: "Phone", type: "tel", pattern: PHONE, patternMessage: "Enter a valid phone number." },
    { name: "position", label: "Position", type: "select", required: true, options: positions },
    { name: "cvLink", label: "Link to CV or LinkedIn", type: "text", maxLength: 400, placeholder: "https://", pattern: /^https?:\/\/\S+$/, patternMessage: "Paste a full link starting with https://" },
  ];
}

/** Small public form (Contact, Career) that posts JSON to the API. */
export default function SimpleForm({
  kind, positions = [], endpoint, submitLabel, idPrefix,
}: { kind: "contact" | "career"; positions?: string[]; endpoint: string; submitLabel: string; idPrefix: string }) {
  const fields = fieldsFor(kind, positions);
  const empty = () => Object.fromEntries(fields.map((f) => [f.name, ""]));
  const [values, setValues] = useState<Record<string, string>>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const m = validateField(f, values[f.name]);
      if (m) errs[f.name] = m;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setStatus(null);
    try {
      const body = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim() || null]));
      const res = await api<{ message: string }>(endpoint, { body });
      setStatus({ ok: true, text: res.message });
      setValues(empty());
    } catch (err) {
      const a = err as ApiError;
      const fieldErrs: Record<string, string> = {};
      for (const f of fields) { const m = a.field?.(f.name); if (m) fieldErrs[f.name] = m; }
      setErrors(fieldErrs);
      setStatus({ ok: false, text: a.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      {status && <div className={`alert ${status.ok ? "alert-ok" : "alert-error"}`} role="status">{status.text}</div>}
      <div className="form-grid">
        {fields.map((f) => (
          <Field key={f.name} def={f} idPrefix={idPrefix} value={values[f.name]} error={errors[f.name]}
            onChange={(n, v) => setValues((s) => ({ ...s, [n]: String(v) }))} />
        ))}
      </div>
      <div style={{ marginTop: "1.4rem" }}>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Sending…" : submitLabel}</button>
      </div>
    </form>
  );
}
