import { SERVER_API_URL } from "./config";
import { defaults, type ContentKey, type ContentMap } from "./defaultContent";
import { mergeContent } from "./merge";

/**
 * Loads a page's content from the API (saved by an admin). Falls back to the built-in
 * defaults when nothing was saved or the API isn't running, so the site always renders.
 */
export async function getContent<K extends ContentKey>(key: K): Promise<ContentMap[K]> {
  const fallback = defaults[key];
  try {
    const res = await fetch(`${SERVER_API_URL}/api/content/${key}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.data && typeof json.data === "object") return mergeContent(fallback, json.data);
    }
  } catch {
    /* API offline: use defaults */
  }
  return fallback;
}
