// These public client values are safe to expose; never put the service-role key here.
const configuredUrl =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
const configuredApiKey =
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseUrl = configuredUrl || 'https://kukqzucjfsvcfzwrbois.supabase.co'
export const supabaseApiKey = configuredApiKey || ''
