import { NextResponse } from "next/server";
import { getAnalyticsSnapshot, trackAnalyticsEvent, type AnalyticsEvent } from "../../_lib/analyticsStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getAnalyticsSnapshot();
  return NextResponse.json(snapshot);
}

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const event = body?.event as AnalyticsEvent | undefined;

  if (event === "visit" || event === "download_click") {
    await trackAnalyticsEvent(event);
  }

  return new NextResponse(null, { status: 204 });
}
