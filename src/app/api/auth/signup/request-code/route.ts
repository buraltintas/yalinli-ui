import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { handleError } from "@/lib/api/route-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const preferredLanguage = body.preferredLanguage === "en" ? "en" : "tr";
    const emailNotificationsEnabled = body.emailNotificationsEnabled !== false;
    const data = await api.post("/v1/auth/signup/request-code", {
      email,
      name,
      preferredLanguage,
      emailNotificationsEnabled
    });
    return NextResponse.json(data);
  } catch (e) {
    return handleError(e);
  }
}
