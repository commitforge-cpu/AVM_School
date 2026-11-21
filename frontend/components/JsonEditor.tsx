"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * Form editor generated from a page's JSON content: text fields for strings, lists you can
 * add to / reorder / remove from, and image previews for *Url fields. Lets admins edit the
 * index page (and every other page) without touching code.
 */

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const LONG_KEYS = /(body|intro|paragraph|description|vision|mission|summary|^a$|text|message)/i;

function humanize(key: string): string {
  if (/^\d+$/.test(key)) return `Item ${Number(key) + 1}`;
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1)
    .replace(/\burl\b/g, "URL").replace(/\bcta\b/g, "button").replace(/\bhref\b/g, "link");
}

/** A blank copy of an item, used when adding to a list. */
function blank(v: Json): Json {
  if (typeof v === "string") return "";
  if (typeof v === "number") return 0;
  if (typeof v === "boolean") return false;
  if (Array.isArray(v)) return [];
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)]));
  return "";
}

function isImageKey(key: string, v: string) {
  return /(logo|image|photo)url$/i.test(key) && /^(https?:)?\/\//.test(v) || /^\/Gallery\//.test(v) || /^\/images\//.test(v);
}

interface NodeProps {
  name: string;
  value: Json;
  onChange: (v: Json) => void;
  path: string;
  resolveUrl: (u: string) => string;
}

function Node({ name, value, onChange, path, resolveUrl }: NodeProps) {
  const id = `je-${path}`;

  if (typeof value === "string") {
    const long = LONG_KEYS.test(name) || value.length > 90;
    return (
      <div className="field" style={{ marginBottom: ".9rem" }}>
        <label htmlFor={id}>{humanize(name)}</label>
        {long ? (
          <textarea id={id} value={value} rows={Math.min(8, Math.max(3, Math.ceil(value.length / 90)))} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
        )}
        {value && isImageKey(name, value) && <img className="img-preview" src={resolveUrl(value)} alt="" />}
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div className="field" style={{ marginBottom: ".9rem" }}>
        <label htmlFor={id}>{humanize(name)}</label>
        <input id={id} type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <label className="check" style={{ marginBottom: ".9rem" }}>
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {humanize(name)}
      </label>
    );
  }

  if (Array.isArray(value)) {
    const update = (i: number, v: Json) => onChange(value.map((x, j) => (j === i ? v : x)));
    const move = (i: number, d: number) => {
      const next = [...value];
      const [item] = next.splice(i, 1);
      next.splice(i + d, 0, item);
      onChange(next);
    };
    return (
      <fieldset>
        <legend>{humanize(name)} ({value.length})</legend>
        {value.map((item, i) => (
          <div className="array-item" key={i}>
            <Node name={typeof item === "object" ? String(i) : `${name.replace(/s$/, "")} ${i + 1}`} value={item}
              onChange={(v) => update(i, v)} path={`${path}-${i}`} resolveUrl={resolveUrl} />
            <div className="array-tools">
              <button type="button" className="btn btn-quiet btn-sm" disabled={i === 0} onClick={() => move(i, -1)}>Move up</button>
              <button type="button" className="btn btn-quiet btn-sm" disabled={i === value.length - 1} onClick={() => move(i, 1)}>Move down</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => onChange(value.filter((_, j) => j !== i))}>Remove</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...value, value.length ? blank(value[value.length - 1]) : ""])}>
          Add {humanize(name).toLowerCase().replace(/s$/, "")}
        </button>
      </fieldset>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    const body = entries.map(([k, v]) => (
      <Node key={k} name={k} value={v} path={`${path}-${k}`} resolveUrl={resolveUrl}
        onChange={(nv) => onChange({ ...value, [k]: nv })} />
    ));
    if (/^\d+$/.test(name) || name === "") return <>{body}</>;
    return <fieldset><legend>{humanize(name)}</legend>{body}</fieldset>;
  }

  return null;
}

export default function JsonEditor({ value, onChange, resolveUrl = (u) => u }: {
  value: Record<string, Json>;
  onChange: (v: Record<string, Json>) => void;
  resolveUrl?: (u: string) => string;
}) {
  return (
    <div className="json-editor">
      <Node name="" value={value} onChange={(v) => onChange(v as Record<string, Json>)} path="root" resolveUrl={resolveUrl} />
    </div>
  );
}

export type { Json };
