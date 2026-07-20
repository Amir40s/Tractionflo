import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";
import { getFreshInstagramAccount } from "@/lib/instagram-token";
import { searchInstagramAudio } from "@/lib/instagram-business-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";

    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseServiceClient();
    const account = await getFreshInstagramAccount(supabase, user.id);

    if (!account) {
      return NextResponse.json(
        { error: "Instagram account not connected" },
        { status: 400 }
      );
    }

    const results = await searchInstagramAudio(account.access_token, account.ig_user_id, query);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Audio search error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search audio" },
      { status: 500 }
    );
  }
}
