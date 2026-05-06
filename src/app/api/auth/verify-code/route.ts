import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { setAuthCookies } from "@/lib/auth";
import { handleError } from "@/lib/api/route-utils";
import { getProfileLanguage } from "@/lib/i18n/dictionaries";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await api.post("/v1/auth/verify-code", body);
    if (data.accessToken) await setAuthCookies(data.accessToken, data.refreshToken);
    const res = NextResponse.json({ ok: true });
    const profileLanguage = await getProfileLanguage(data.accessToken);
    if (profileLanguage) {
      res.cookies.set("yalinli_lang", profileLanguage, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return res;
  } catch (e) {
    return handleError(e);
  }
}
