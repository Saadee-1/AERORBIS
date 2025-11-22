// Re-export from unified Supabase client
// This file maintains backward compatibility for existing imports
export { supabase, getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabaseClient';
export type { Database } from './types';