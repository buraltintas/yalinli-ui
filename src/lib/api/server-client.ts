import "server-only";

import { cookies } from "next/headers";
import { headers as nextHeaders } from "next/headers";
import { getAccessToken, getRefreshToken, setAuthCookies, clearAuthCookies } from "@/lib/auth";
import { Language } from "@/lib/types";

const API_BASE_VALUE = process.env.YALINLI_API_BASE_URL;
const BFF_SECRET_VALUE = process.env.YALINLI_API_BFF_SECRET;

const API_BASE: string | null = API_BASE_VALUE ?? null;
const BFF_SECRET: string | null = BFF_SECRET_VALUE ?? null;

type Opts = RequestInit & { lang?: Language; auth?: boolean };

async function raw(path: string, options: Opts = {}) {
  if (!API_BASE || !BFF_SECRET) {
    throw {
      status: 500,
      code: "missing_env",
      message: "Missing YALINLI_API_BASE_URL or YALINLI_API_BFF_SECRET"
    };
  }

  const token = options.auth ? await getAccessToken() : undefined;
  const cookieLang = (await cookies()).get("yalinli_lang")?.value;
  const fallbackLang = ((await nextHeaders()).get("accept-language") || "").toLowerCase().startsWith("tr") ? "tr" : "en";
  const lang = options.lang ?? (cookieLang === "tr" || cookieLang === "en" ? cookieLang : fallbackLang);
  const requestHeaders = new Headers(options.headers);
  requestHeaders.set("X-BFF-SECRET", BFF_SECRET);
  requestHeaders.set("Accept-Language", lang);
  if (options.body && !requestHeaders.has("Content-Type") && !(options.body instanceof FormData)) requestHeaders.set("Content-Type", "application/json");
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers: requestHeaders, cache: "no-store" });

  if (res.status === 401 && options.auth) {
    const refreshed = await tryRefresh(lang);
    if (refreshed) {
      const nextToken = await getAccessToken();
      if (nextToken) requestHeaders.set("Authorization", `Bearer ${nextToken}`);
      res = await fetch(`${API_BASE}${path}`, { ...options, headers: requestHeaders, cache: "no-store" });
    }
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const error = payload?.error;
    throw { status: res.status, code: error?.code ?? "request_failed", message: error?.message ?? "Request failed" };
  }

  return payload;
}

async function tryRefresh(lang: Language) {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const payload = await raw("/v1/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }), lang });
    if (payload?.accessToken) {
      await setAuthCookies(payload.accessToken);
      return true;
    }
  } catch {
    await clearAuthCookies();
  }
  return false;
}

export const api = {
  get: (path: string, options?: Opts) => raw(path, { ...options, method: "GET" }),
  post: (path: string, body?: unknown, options?: Opts) => raw(path, { ...options, method: "POST", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: (path: string, body: unknown, options?: Opts) => raw(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string, body?: unknown, options?: Opts) => raw(path, { ...options, method: "DELETE", body: body ? JSON.stringify(body) : undefined })
};
