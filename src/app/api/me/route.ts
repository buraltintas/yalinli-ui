import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { handleError } from "@/lib/api/route-utils";

export async function GET() {
  try {
    return NextResponse.json(await api.get("/v1/me", { auth: true }));
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    return NextResponse.json(await api.patch("/v1/me", await req.json(), { auth: true }));
  } catch (e) {
    return handleError(e);
  }
}
