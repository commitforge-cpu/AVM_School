"use client";

import type { FieldDef } from "@/lib/studentFields";

/** Renders one FieldDef as a labelled input with its error message. */
export default function Field({
  def, value, error, onChange, idPrefix = "f",
}: {
  def: FieldDef;
  value: string | boolean | undefined;
  error?: string;
  onChange: (name: string, value: string | boolean) => void;
  idPrefix?: string;
}) {
  const id = `${idPrefix}-${def.name}`;
  const errId = `${id}-err`;
  const common = {
    id,
    name: def.name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errId : def.hint ? `${id}-hint` : undefined,
    required: def.required,
  } as const;

  if (def.type === "checkbox") {
    return (
      <div className={`field ${def.wide ? "wide" : ""}`}>
        <label className="check" htmlFor={id}>
          <input type="checkbox" {...common} checked={!!value} onChange={(e) => onChange(def.name, e.target.checked)} />
          <span>{def.label}</span>
        </label>
      </div>
    );
  }

  const str = typeof value === "string" ? value : "";
  return (
    <div className={`field ${def.wide ? "wide" : ""}`}>
      <label htmlFor={id}>
        {def.label}
        {def.required && <span className="req" aria-hidden="true">*</span>}
      </label>
      {def.type === "select" ? (
        <select {...common} value={str} onChange={(e) => onChange(def.name, e.target.value)}>
          <option value="">Select…</option>
          {(def.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          {str && !(def.options ?? []).includes(str) && <option value={str}>{str}</option>}
        </select>
      ) : def.type === "textarea" ? (
        <textarea {...common} value={str} maxLength={def.maxLength} placeholder={def.placeholder} onChange={(e) => onChange(def.name, e.target.value)} />
      ) : (
        <input
          {...common}
          type={def.type}
          value={str}
          maxLength={def.maxLength}
          placeholder={def.placeholder}
          inputMode={def.type === "tel" || def.name === "pincode" || def.name === "aadhaarNumber" ? "numeric" : undefined}
          autoComplete={def.name === "email" ? "email" : def.name === "phone" ? "tel" : undefined}
          onChange={(e) => onChange(def.name, e.target.value)}
        />
      )}
      {def.hint && !error && <span className="hint" id={`${id}-hint`}>{def.hint}</span>}
      {error && <span className="error" id={errId}>{error}</span>}
    </div>
  );
}
