/** Public URL of the ASP.NET Core API. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5080").replace(/\/$/, "");

/** URL the Next.js server uses for server-side fetches (defaults to the public one). */
export const SERVER_API_URL = (process.env.API_URL || API_URL).replace(/\/$/, "");

/** Gallery URLs come back from the API as "/Gallery/<file>"; make them absolute. */
export function assetUrl(url?: string | null): string {
  if (!url) return "";
  return url.startsWith("/Gallery/") ? `${API_URL}${url}` : url;
}
