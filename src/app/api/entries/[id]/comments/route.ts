import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { handleError } from "@/lib/api/route-utils";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await api.get(`/v1/entries/${id}/comments`);
    return NextResponse.json(data);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = await api.post(`/v1/entries/${id}/comments`, body);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
