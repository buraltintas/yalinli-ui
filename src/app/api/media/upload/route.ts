import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { handleError } from "@/lib/api/route-utils";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const data = await api.post("/v1/media/upload", form, { auth: true });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
