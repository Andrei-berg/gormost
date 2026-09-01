import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Supabase 2026 key system: `sb_publishable_…` replaces the legacy `anon` key.
// Legacy names are kept as fallbacks so existing deployments keep working
// until their env vars are migrated.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL!
const supabaseKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
