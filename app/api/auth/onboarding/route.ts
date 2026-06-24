import { NextResponse } from "next/server";
import { compactUserAuthMetadata } from "@/lib/auth-metadata";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
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

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...compactUserAuthMetadata(user.user_metadata),
        onboarding_completed: true,
      },
    });

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update onboarding status";
    console.error("Onboarding completion error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
