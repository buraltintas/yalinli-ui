import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { handleError } from "@/lib/api/route-utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await api.post(`/v1/petitions/${id}/sign`, await req.json(), { auth: true }), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
