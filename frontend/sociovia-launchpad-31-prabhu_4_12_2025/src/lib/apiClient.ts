// src/lib/apiClient.ts
// Centralized HTTP helper that sends cookies (session-based auth).
import { API_ENDPOINT } from "@/config";

const API_BASE = API_ENDPOINT;

export type ApiResult<T = any> = { ok: boolean; status: number; data?: T; error?: any; headers?: Record<string, string> };

// Get fallback user ID from localStorage (for when cookies don't work)
function getFallbackUserId(): string | null {
  try {
    return localStorage.getItem("sv_user_id");
  } catch {
    return null;
  }
}

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<ApiResult<T>> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  // Build headers with fallback X-User-Id for incognito/mobile browsers
  const fallbackUserId = getFallbackUserId();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> || {}),
  };
  if (fallbackUserId) {
    headers["X-User-Id"] = fallbackUserId;
  }

  // Add Bearer token for cross-origin auth (when cookies fail)
  const token = localStorage.getItem("sv_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Destructure headers from opts to avoid overwriting our constructed headers object during spread
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { headers: _optsHeaders, ...restOpts } = opts;

  const init: RequestInit = {
    credentials: "include", // IMPORTANT: send cookies for session auth
    headers,
    ...restOpts,
  };

  try {
    const res = await fetch(url, init);

    const ct = res.headers.get("content-type") || "";
    let body: any = null;
    if (ct.includes("application/json")) {
      body = await res.json().catch(() => null);
    } else {
      // keep text fallback so non-JSON responses don't crash
      body = await res.text().catch(() => null);
    }

    const resHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => { resHeaders[k] = v; });

    if (res.status === 204) return { ok: true, status: res.status, data: null as any, headers: resHeaders };

    if (!res.ok) {
      return { ok: false, status: res.status, error: body || { message: res.statusText }, headers: resHeaders };
    }

    return { ok: true, status: res.status, data: body, headers: resHeaders };
  } catch (err) {
    return { ok: false, status: 0, error: err };
  }
}

async function get<T = any>(path: string, params?: Record<string, any>) {
  let p = path;
  if (params) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) q.append(k, String(v));
    });
    p = `${path}${path.includes("?") ? "&" : "?"}${q.toString()}`;
  }
  return request<T>(p, { method: "GET" });
}
async function post<T = any>(path: string, body?: any) {
  return request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}
async function put<T = any>(path: string, body?: any) {
  return request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
}
async function patch<T = any>(path: string, body?: any) {
  return request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
}
async function del<T = any>(path: string, headers?: Record<string, string>) {
  return request<T>(path, { method: "DELETE", headers });
}

async function generateFromProdLink(payload: { product: { source_urls: string[]; title?: string }; prompt?: string; model_id?: string; export_resizes?: boolean }) {
  return post("/v1/generate-from-prodlink", payload);
}

async function generateCopy(payload: { product: { title: string; description: string }; prompt: string; count: number }) {
  return post("/v1/generate-copy", payload);
}

async function searchInterests(query: string) {
  return get("/api/social/search", { type: "adinterest", q: query });
}

export default { request, get, post, put, patch, delete: del, del, generateFromProdLink, generateCopy, searchInterests, API_BASE };
