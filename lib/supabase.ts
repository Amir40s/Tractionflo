import { createClient } from '@supabase/supabase-js';

function getSupabaseServiceEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing = [];

  if (!supabaseUrl?.trim()) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseKey?.trim()) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing Supabase environment variable${missing.length === 1 ? '' : 's'}: ${missing.join(
        ', '
      )}. Add them to .env.local or .env and restart the dev server.`
    );
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseKey: supabaseKey!,
  };
}

export function createSupabaseServiceClient() {
  const { supabaseUrl, supabaseKey } = getSupabaseServiceEnv();

  return createClient(supabaseUrl, supabaseKey);
}
