import { NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { clearAuthCookies, getRefreshToken } from "@/lib/auth";

export async function POST() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try { await api.post("/v1/auth/logout", { refreshToken }); } catch {}
  }
  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
