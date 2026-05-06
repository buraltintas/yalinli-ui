import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api/server-client";
import { handleError } from "@/lib/api/route-utils";

export async function GET() {
  try {
    return NextResponse.json(await api.get("/v1/me/notification-preferences", { auth: true }));
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json(
      await api.patch(
        "/v1/me/notification-preferences",
        {
          NotifyNewEntries: body.NotifyNewEntries ?? body.notifyNewEntries,
          NotifyResolvedProblems: body.NotifyResolvedProblems ?? body.notifyResolvedProblems,
          NotifyNewPetitions: body.NotifyNewPetitions ?? body.notifyNewPetitions,
          NotifyNewEvents: body.NotifyNewEvents ?? body.notifyNewEvents,
          NotifyAnnouncements: body.NotifyAnnouncements ?? body.notifyAnnouncements
        },
        { auth: true }
      )
    );
  } catch (e) {
    return handleError(e);
  }
}
