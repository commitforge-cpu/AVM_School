type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Saved content laid over the defaults. Objects merge field by field, so a saved page that is
 * missing a field (e.g. after an update adds new fields) still renders with the default for it.
 * Arrays and plain values from the saved content replace the defaults as a whole.
 */
export function mergeContent<T>(defaults: T, saved: unknown): T {
  if (!isObj(defaults) || !isObj(saved)) return (saved === undefined || saved === null ? defaults : (saved as T));
  const out: Obj = { ...defaults };
  for (const [k, v] of Object.entries(saved)) {
    const d = (defaults as Obj)[k];
    if (v === undefined || v === null) continue;
    if (isObj(d)) out[k] = isObj(v) ? mergeContent(d, v) : d;
    else if (Array.isArray(d)) out[k] = Array.isArray(v) ? v : d;
    else if (d !== undefined && typeof d !== typeof v) continue; // wrong type: keep default
    else out[k] = v;
  }
  return out as T;
}
