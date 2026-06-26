import { readFileSync } from "fs";
import { resolve } from "path";
import OpenAI from "openai";

// Load .env manually
const envPath = resolve(process.cwd(), ".env");
const env: Record<string, string> = {};
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
} catch {}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing environment variables.");
  process.exit(1);
}

import { createClient } from "@supabase/supabase-js";
import { resolvePlatformAiConfig } from "../lib/platform-ai-config";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
  // Get platform config
  const platformConfig = await resolvePlatformAiConfig(supabase);
  const apiKey = platformConfig.apiKey;

  if (!apiKey) {
    console.error("No OpenAI API key found via resolvePlatformAiConfig.");
    return;
  }

  console.log("Resolved API Key source:", platformConfig.source);

  // Get users
  const { data: { users } } = await supabase.auth.admin.listUsers();
  for (const user of users) {
    const metadata = user.user_metadata || {};
    const assistantId = metadata.openai_assistant_id;
    if (assistantId) {
      console.log(`User: ${user.email}, Assistant ID: ${assistantId}`);
      const openai = new OpenAI({ apiKey });
      try {
        const assistant = await openai.beta.assistants.retrieve(assistantId);
        console.log("Assistant Details:");
        console.log(JSON.stringify(assistant, null, 2));
      } catch (err: any) {
        console.error(`Error retrieving assistant: ${err.message}`);
      }
    }
  }
}

check().catch(console.error);
