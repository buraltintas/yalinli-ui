import { NextResponse } from "next/server";

type RouteError = { code?: string; message?: string; status?: number };

const safeMessages: Record<number, string> = {
  400: "Please check the information and try again.",
  401: "Your session is not valid. Please sign in again.",
  403: "You are not allowed to perform this action.",
  404: "Not found.",
  409: "This request conflicts with an existing record.",
  429: "Too many attempts. Please wait a moment.",
  500: "Something went wrong. Please try again later."
};

const passThroughCodes = new Set([
  "user_already_exists",
  "user_not_found",
  "invalid_input",
  "unauthorized",
  "forbidden",
  "not_found",
  "rate_limited",
  "terms_not_accepted",
  "PETITION_ALREADY_SIGNED"
]);

export function handleError(error: unknown) {
  const e = (error ?? {}) as RouteError;
  const status = e.status ?? 500;
  const code = passThroughCodes.has(e.code ?? "") ? e.code : status >= 500 ? "request_failed" : e.code ?? "request_failed";

  return NextResponse.json(
    { error: { code, message: safeMessages[status] ?? safeMessages[500] } },
    { status }
  );
}
