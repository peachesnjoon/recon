import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error("[supabase] Missing env vars — NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY not set")
}

const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-key"
)

export default supabase
export const isConfigured = !!(url && key)
