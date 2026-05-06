import { NextRequest, NextResponse } from "next/server";

const LANGUAGE_COOKIE = "yalinli_lang";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(LANGUAGE_COOKIE)?.value) {
    const acceptLanguage = request.headers.get("accept-language") || "";
    const language = acceptLanguage.toLowerCase().startsWith("tr") ? "tr" : "en";
    response.cookies.set(LANGUAGE_COOKIE, language, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax"
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)"]
};
