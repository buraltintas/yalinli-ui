import { cookies } from "next/headers";

const ACCESS_COOKIE = "yalinli_access_token";
const REFRESH_COOKIE = "yalinli_refresh_token";

export async function getAccessToken() {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken() {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

export async function setAuthCookies(accessToken: string, refreshToken?: string) {
  const c = await cookies();
  const base = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  c.set(ACCESS_COOKIE, accessToken, { ...base, maxAge: 60 * 60 });
  if (refreshToken) c.set(REFRESH_COOKIE, refreshToken, { ...base, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearAuthCookies() {
  const c = await cookies();
  c.delete(ACCESS_COOKIE);
  c.delete(REFRESH_COOKIE);
}
