/** Normalize API base URL (no trailing slash). Empty means use same-origin + Next rewrites. */
export function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
  return raw.replace(/\/+$/, "").trim();
}

/**
 * Build the URL for a backend API path.
 * If `NEXT_PUBLIC_API_URL` is unset, returns a same-origin path (e.g. `/api/cv/upload`) so
 * Next.js `rewrites` can proxy to FastAPI.
 */
export function apiUrl(path: string): string {
  const base = getApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

/** User-facing hint when the API is unreachable. */
export const API_OFFLINE_HINT =
  "The API did not respond. Start the backend from the `backend` folder: activate your venv, then run `uvicorn main:app --reload --host 127.0.0.1 --port 8000`. Or leave `NEXT_PUBLIC_API_URL` empty in `.env.local` so requests use this app’s `/api` proxy (still requires uvicorn on port 8000).";
