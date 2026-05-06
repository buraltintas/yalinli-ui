import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { handleError } from "@/lib/api/route-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await api.post("/v1/auth/login/request-code", body);
    return NextResponse.json(data);
  } catch (e) {
    return handleError(e);
  }
}
