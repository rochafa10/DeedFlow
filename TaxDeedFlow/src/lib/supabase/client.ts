import { createClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"

// Create context logger for Supabase client
const supabaseLogger = logger.withContext('Supabase Client')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseLogger.warn('Missing environment variables. Using mock data mode.', {
    message: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  })
}

// Create Supabase client - returns null if credentials not configured
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Helper to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null
}

// Server-side client with service role (for API routes)
// Falls back to anon key if service role key is not configured
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = serviceRoleKey || anonKey

  if (!supabaseUrl || !key) {
    supabaseLogger.warn('Missing Supabase credentials')
    return null
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
