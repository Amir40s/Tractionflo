const SUPABASE_PUBLIC_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

type SupabasePublicEnv = (typeof SUPABASE_PUBLIC_ENV)[number]

function getEnvValue(name: SupabasePublicEnv) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

export function getMissingSupabasePublicEnv() {
  return SUPABASE_PUBLIC_ENV.filter((name) => !getEnvValue(name))
}

export function formatMissingSupabasePublicEnv(missing = getMissingSupabasePublicEnv()) {
  return `Missing Supabase environment variable${missing.length === 1 ? '' : 's'}: ${missing.join(
    ', '
  )}. Add them to .env.local or .env and restart the dev server.`
}

export function getSupabasePublicEnv() {
  const missing = getMissingSupabasePublicEnv()

  if (missing.length > 0) {
    throw new Error(formatMissingSupabasePublicEnv(missing))
  }

  return {
    supabaseUrl: getEnvValue('NEXT_PUBLIC_SUPABASE_URL')!,
    supabaseAnonKey: getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY')!,
  }
}
