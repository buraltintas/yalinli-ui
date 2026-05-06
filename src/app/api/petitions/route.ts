import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { handleError } from "@/lib/api/route-utils";

export async function GET() {
  try {
    return NextResponse.json(await api.get("/v1/petitions"));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(await api.post("/v1/petitions", await req.json(), { auth: true }), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
