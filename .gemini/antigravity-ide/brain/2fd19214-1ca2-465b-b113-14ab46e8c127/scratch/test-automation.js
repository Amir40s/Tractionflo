module.paths.push('c:/Users/Mharoon7/Documents/GitHub/TractionFlo/node_modules');

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../../../Documents/GitHub/TractionFlo/.env');
  console.log('Loading .env from:', envPath);
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found at', envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    // remove quotes if any
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const igUserId = "17841427390559565";
  console.log(`\n--- Searching for Instagram Account with ig_user_id: ${igUserId} ---`);
  
  const { data: account, error: accountError } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('ig_user_id', igUserId)
    .limit(1)
    .maybeSingle();

  if (accountError) {
    console.error('Database error fetching account:', accountError);
    return;
  }

  if (!account) {
    console.log('No connected Instagram account found in database.');
    return;
  }

  console.log('Account found:');
  console.log(JSON.stringify({
    id: account.id,
    user_id: account.user_id,
    ig_user_id: account.ig_user_id,
    access_token_preview: account.access_token ? `${account.access_token.slice(0, 15)}...` : 'none',
    created_at: account.created_at
  }, null, 2));

  if (!account.user_id) {
    console.log('No user_id associated with this account record.');
    return;
  }

  console.log(`\n--- Fetching User metadata for user_id: ${account.user_id} ---`);
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(account.user_id);

  if (userError) {
    console.error('Auth admin error fetching user:', userError);
    return;
  }

  if (!user) {
    console.log('No user found in Auth system.');
    return;
  }

  const metadata = user.user_metadata || {};
  console.log('User metadata:');
  console.log(JSON.stringify({
    email: user.email,
    openai_assistant_id: metadata.openai_assistant_id,
    openai_api_key_preview: metadata.openai_api_key ? `${metadata.openai_api_key.slice(0, 7)}...${metadata.openai_api_key.slice(-4)}` : 'none',
    ai_integration_auto_send: metadata.ai_integration_auto_send,
    ai_integration_system_prompt: metadata.ai_integration_system_prompt ? `${metadata.ai_integration_system_prompt.slice(0, 50)}...` : 'none',
  }, null, 2));

  const apiKey = metadata.openai_api_key;
  const assistantId = metadata.openai_assistant_id;

  if (!apiKey) {
    console.log('No OpenAI API key found in user metadata. Cannot proceed with assistant run.');
    return;
  }

  if (!assistantId) {
    console.log('No OpenAI Assistant ID found in user metadata. Cannot proceed with assistant run.');
    return;
  }

  console.log(`\n--- Initializing OpenAI and testing Assistant Thread run ---`);
  const { OpenAI } = require('openai');
  const openai = new OpenAI({ apiKey });

  try {
    console.log('Creating thread...');
    const thread = await openai.beta.threads.create({
      messages: [{ role: 'user', content: 'Instagram participant: test_lead\n\nRecent conversation:\nInstagram user: Tell me about your products?\n\nWrite the next best reply.' }],
    });
    console.log('Thread created:', thread.id);

    console.log('Creating and polling run...');
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
      max_completion_tokens: 180,
    });

    console.log('Run finished with status:', run.status);
    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id, { limit: 1 });
      console.log('Reply from assistant:', messages.data[0].content[0].text.value);
    } else {
      console.log('Run failed details:', JSON.stringify(run, null, 2));
    }
  } catch (openaiError) {
    console.error('OpenAI Error captured:');
    console.error(openaiError);
    if (openaiError.response) {
      console.error('Response headers:', openaiError.response.headers);
      console.error('Response body:', await openaiError.response.text());
    }
  }
}

test().catch(console.error);
