import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { getFreshInstagramAccount } from "@/lib/instagram-token";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Debug endpoint to fetch RAW Instagram posts response
 */
export async function GET(request: NextRequest) {
  const logs: string[] = [];
  const addLog = (msg: string) => {
    logs.push(msg);
    console.log(msg);
  };

  try {
    addLog("=== Instagram Raw Posts Debug ===");

    // Get user
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById("40d439ff-3d84-4fa8-a24e-19667059161e");
    
    if (!user?.id) {
      return NextResponse.json({ error: "User not found", logs });
    }

    addLog(`✅ User: ${user.id}`);

    // Get Instagram account
    const igAccount = await getFreshInstagramAccount(supabase, user.id);
    if (!igAccount) {
      addLog("❌ No Instagram account found");
      return NextResponse.json({ error: "No Instagram account", logs });
    }

    addLog(`✅ Instagram account: ${igAccount.ig_user_id}`);

    // Try all field combinations and log raw responses
    const fieldCombos = [
      "id,caption,media_type,timestamp,like_count,comments_count",
      "id,caption,media_type,timestamp,like_count",
      "id,caption,media_type,timestamp",
      "id,caption",
    ];

    for (const fields of fieldCombos) {
      addLog(`\n📡 Trying fields: ${fields}`);

      try {
        const response = await fetch(
          `https://graph.instagram.com/v21.0/${igAccount.ig_user_id}/media?fields=${fields}&access_token=${igAccount.access_token}`
        );

        const data = await response.json();

        if (!response.ok) {
          addLog(`❌ Error: ${JSON.stringify(data)}`);
          continue;
        }

        addLog(
          `✅ Success! Raw response:\n${JSON.stringify(data, null, 2)}`
        );

        // Check data structure
        if (data.data && Array.isArray(data.data)) {
          addLog(`📊 Posts returned: ${data.data.length}`);

          // Show each post
          data.data.forEach((post: any, idx: number) => {
            addLog(`  Post ${idx + 1}: ${JSON.stringify(post)}`);
          });

          // If we got data, don't try other field combos
          if (data.data.length > 0) {
            break;
          }
        }
      } catch (error) {
        addLog(`❌ Exception: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    addLog(`❌ Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: "Debug failed", logs }, { status: 500 });
  }
}
