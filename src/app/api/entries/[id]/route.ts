import { NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { handleError } from "@/lib/api/route-utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await api.get(`/v1/entries/${id}`);
    return NextResponse.json(data);
  } catch (e) {
    return handleError(e);
  }
}
