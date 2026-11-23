import { createClient } from '@supabase/supabase-js'
import { supabaseApiKey, supabaseUrl } from './supabase-info'

export const supabase = createClient(supabaseUrl, supabaseApiKey)
