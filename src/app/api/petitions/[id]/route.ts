import { NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { handleError } from "@/lib/api/route-utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(await api.get(`/v1/petitions/${id}`, { auth: true }));
  } catch (e) {
    return handleError(e);
  }
}
