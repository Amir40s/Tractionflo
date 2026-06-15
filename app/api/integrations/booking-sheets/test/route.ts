import { NextResponse } from "next/server";
import {
  getSheetDestinationUrl,
  isAppsScriptUrl,
  isExcelUrl,
  type BookingSheetRouteConfig,
  writeBookingRows,
} from "@/lib/booking-sheet-export";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildTestRow(route: BookingSheetRouteConfig) {
  const now = new Date();

  return {
    customer: "TractionFlo Route Test",
    phone: "+92 test",
    bookingType: getString(route.bookingType) || "Confirmed booking",
    date: now.toLocaleDateString("en-CA"),
    time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    groundOrCourt: getString(route.name) || "Booking sheet route",
    paymentStatus: "Test",
    confirmedAt: now.toISOString(),
    sourceConversation: "Test route button",
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as { route?: BookingSheetRouteConfig };
    const route = payload.route || {};
    const destinationUrl = getSheetDestinationUrl(getString(route.sheetUrl));

    if (!destinationUrl) {
      return NextResponse.json({ error: "Add a valid Google Sheet ID, Google Sheet link, Apps Script URL, or Excel web link first." }, { status: 400 });
    }

    if (isExcelUrl(destinationUrl) && !isAppsScriptUrl(destinationUrl)) {
      return NextResponse.json(
        {
          error:
            "This Excel link can be opened/copied, but a real write test needs a Microsoft Graph or webhook integration. Use a Google Sheet ID/link or Apps Script URL for Test route.",
        },
        { status: 400 },
      );
    }

    const result = await writeBookingRows(route, [buildTestRow(route)], { includeHeaders: true });

    return NextResponse.json({
      ok: true,
      lastSync: result.lastSync.replace("Booking saved", "Test row written"),
      message: `${getString(route.name) || "Booking sheet route"} wrote a test row. You can delete the TractionFlo Route Test row after checking.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not test the booking sheet route.";

    console.error("Booking sheet route test error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
