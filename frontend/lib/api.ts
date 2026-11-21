"use client";

import { API_URL } from "./config";

const TOKEN_KEY = "avm_token";
export const AUTH_EXPIRED_EVENT = "avm-auth-expired";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: the session lasts until the tab closes */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
  /** First error for a field, matching ASP.NET's PascalCase or camelCase keys. */
  field(name: string): string | undefined {
    const key = Object.keys(this.fieldErrors).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? this.fieldErrors[key][0] : undefined;
  }
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
};

async function toError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status}).`;
  let errors: Record<string, string[]> = {};
  try {
    const p = await res.json();
    errors = p.errors ?? {};
    const first = Object.values(errors)[0]?.[0];
    message = (Object.keys(errors).length ? first : p.title || p.detail || p.message) || message;
  } catch {
    if (res.status === 429) message = "Too many attempts. Wait a minute and try again.";
    if (res.status === 413) message = "The upload is too large.";
  }
  if (res.status === 0 || res.status >= 500) message = message || "The server had a problem. Try again shortly.";
  return new ApiError(message, res.status, errors);
}

/** Calls the API with the saved login token. Throws ApiError on failure. */
export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(`Can't reach the school server at ${API_URL}. Check that the API is running.`, 0);
  }

  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Fetches a protected file (e.g. a student photo) and returns an object URL for <img src>. */
export async function apiObjectUrl(path: string): Promise<string | null> {
  const token = getToken();
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  } catch {
    return null;
  }
}
