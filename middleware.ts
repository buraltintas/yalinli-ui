import { NextRequest, NextResponse } from "next/server";
import { door, doorResponse, paths, type DoorSite } from "@/lib/door";

const LANGUAGE_COOKIE = "yalinli_lang";

// What the door guards on yalinli.org. src/lib/door.ts holds the rules and is the same file
// on every site; only this object is yalinli's own.
const YALINLI: DoorSite = {
  site: "yalinli",
  // The pages the Alibaba and Tencent clouds polled and enumerated: the home page and the
  // entries. Only these are refused to those networks.
  content: paths("/", "/entries/*"),
  // Sign-in, account, form and legal pages: never refused for coming from those clouds,
  // never counted or judged by the shadow layers.
  exempt: paths(
    "/login",
    "/signup",
    "/verify-code",
    "/profile",
    "/submit",
    "/petitions/new",
    "/petitions/:id",
    "/petitions/:id/export",
    "/terms",
    "/privacy",
    "/contact"
  ),
  contact: "info@yalinli.org",
  siteCookies: [LANGUAGE_COOKIE, "yalinli_access_token", "yalinli_refresh_token"]
  // No jsEvidence: the door does not run on /api (see the matcher), so it would never see
  // /api/lang. The Next-Url header on the router's own requests is the evidence instead.
};

// The paths the language cookie has always been set on: pages, never API routes or files.
const LANGUAGE_PATHS = /^\/(?!api|_next\/static|_next\/image|favicon\.ico|icon\.svg|.*\..*)/;

export function middleware(request: NextRequest) {
  const verdict = door(request, YALINLI);
  if (verdict.action !== "pass") return doorResponse(verdict);

  const response = NextResponse.next();

  if (LANGUAGE_PATHS.test(request.nextUrl.pathname) && !request.cookies.get(LANGUAGE_COOKIE)?.value) {
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
  // As before the door, the API routes stay out: a matched route has its request body
  // buffered by Next (10 MB cap). Paths with a dot in them now come in, so the door sees
  // robots.txt, /.well-known and probe paths such as /.env and /xmlrpc.php.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"]
};
