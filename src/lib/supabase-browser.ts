// Browser-safe Supabase client using NEXT_PUBLIC_ vars.
// Used only by auth.ts, logger.ts, alerts.ts, and a few legacy components
// that make direct DB calls. These calls still go to supabase.co from the
// browser — migrate them to api-client.ts when ISP-blocking is a concern.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
