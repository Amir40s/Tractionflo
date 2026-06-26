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

import { createClient } from "@supabase/supabase-js";
import { resolvePlatformAiConfig } from "../lib/platform-ai-config";
const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

async function testRun() {
  const platformConfig = await resolvePlatformAiConfig(supabase);
  const apiKey = platformConfig.apiKey;
  const openai = new OpenAI({ apiKey });

  // Get first user's assistant
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.user_metadata?.openai_assistant_id);
  if (!user) {
    console.error("No user with assistant ID found.");
    return;
  }

  const assistantId = user.user_metadata.openai_assistant_id;
  console.log(`Using assistant: ${assistantId}`);

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: "Instagram participant: testuser\nRecent conversation:\nInstagram user: hi\nWrite the next best reply.",
      }
    ]
  });

  const additionalInstructions = `
Return only valid JSON. No markdown. No commentary.
Always include a "ros" object.
JSON shape:
{
  "reply": "best next answer to the latest user message",
  "ros": {
    "decision": {
      "bestNextAction": "single best next action"
    }
  }
}
  `;

  console.log("Running assistant with response_format: json_object...");
  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistantId,
    additional_instructions: additionalInstructions,
    response_format: { type: "json_object" },
  });

  console.log("Run completed with status:", run.status);
  if (run.status === "completed") {
    const messages = await openai.beta.threads.messages.list(thread.id, { limit: 1 });
    console.log("Raw Response Content:");
    console.log(JSON.stringify(messages.data[0].content, null, 2));
  } else {
    console.log("Run details:", JSON.stringify(run, null, 2));
  }
}

testRun().catch(console.error);
