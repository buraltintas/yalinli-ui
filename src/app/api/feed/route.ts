import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { handleError } from "@/lib/api/route-utils";

export async function GET(req: NextRequest) {
  try {
    const qs = req.nextUrl.searchParams.toString();
    const data = await api.get(`/v1/feed${qs ? `?${qs}` : ""}`);
    return NextResponse.json(data);
  } catch (e) {
    return handleError(e);
  }
}
