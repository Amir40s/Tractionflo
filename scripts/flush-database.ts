/**
 * Flush all application data from the Supabase database.
 * 
 * This script truncates every application table while preserving:
 *   - Table structures, indexes, RLS policies, and triggers
 *   - Auth users (managed by Supabase Auth, not touched here)
 *
 * Usage:  npx tsx scripts/flush-database.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env manually since dotenv may not be installed
const envPath = resolve(process.cwd(), ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Order matters: child tables (with foreign keys) must be truncated before parent tables.
// Using TRUNCATE ... CASCADE handles this, but listing in dependency order for clarity.
const TABLES_TO_FLUSH = [
  // --- ROS child tables (depend on ros_prospects, ros_revenue_decisions, ros_revenue_outcomes) ---
  "ros_outcome_executions",
  "ros_conversion_events",
  "ros_learning_events",
  "ros_strategy_adaptations",
  "ros_learning_summaries",

  // --- ROS mid-level tables ---
  "ros_escalation_events",
  "ros_revenue_outcomes",
  "ros_revenue_decisions",
  "ros_conversation_insights",

  // --- ROS parent tables ---
  "ros_business_profiles",
  "ros_provider_connections",
  "ros_prospects",

  // --- Commerce ---
  "commerce_orders",

  // --- Support & Issues ---
  "support_tickets",
  "creator_issues",

  // --- Analytics ---
  "platform_analytics_events",

  // --- Messaging ---
  "messages",

  // --- Instagram ---
  "instagram_accounts",
];

async function flush() {
  console.log("🗑️  Flushing all application data...\n");

  let successCount = 0;
  let skipCount = 0;

  for (const table of TABLES_TO_FLUSH) {
    // Use the Supabase RPC to execute raw SQL for TRUNCATE CASCADE
    const { error } = await supabase.rpc("exec_sql", {
      query: `TRUNCATE TABLE public."${table}" CASCADE`,
    });

    if (error) {
      // If the rpc doesn't exist, fall back to delete
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // match all rows

      if (deleteError) {
        console.log(`  ⚠️  ${table}: skipped (${deleteError.message})`);
        skipCount++;
      } else {
        console.log(`  ✅ ${table}: cleared (via delete)`);
        successCount++;
      }
    } else {
      console.log(`  ✅ ${table}: truncated`);
      successCount++;
    }
  }

  console.log(`\n✨ Done! ${successCount} tables flushed, ${skipCount} skipped.`);
  console.log("ℹ️  Auth users were NOT deleted (managed by Supabase Auth).");
  console.log("ℹ️  Table structures, indexes, RLS policies, and triggers are preserved.");
}

flush().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
