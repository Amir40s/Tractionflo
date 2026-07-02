/**
 * One-shot script: create the superadmin user in Supabase Auth.
 * Usage:  npx tsx scripts/create-admin.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const email = "tractionflo@gmail.com";
  const password = "tractionflo123";

  // Check if user already exists
  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing?.users?.find((u) => u.email?.toLowerCase() === email);

  if (found) {
    console.log(`User ${email} already exists (id: ${found.id}). Updating metadata + password…`);
    const { data, error } = await supabase.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
      user_metadata: {
        role: "superadmin",
        account_role: "superadmin",
        is_superadmin: true,
        full_name: "Tractionflo Admin",
      },
    });
    if (error) {
      console.error("Update failed:", error.message);
      process.exit(1);
    }
    console.log("✓ Updated successfully:", data.user.id);
    return;
  }

  // Create new user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "superadmin",
      account_role: "superadmin",
      is_superadmin: true,
      full_name: "Tractionflo Admin",
    },
  });

  if (error) {
    console.error("Creation failed:", error.message);
    process.exit(1);
  }

  console.log("✓ Admin user created:", data.user.id);
  console.log("  Email:", email);
  console.log("  Role: superadmin");
}

main();
