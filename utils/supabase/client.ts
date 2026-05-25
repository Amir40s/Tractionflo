import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicEnv } from './env'

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv()

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
