import { getSupabaseClient } from './client';

export function supabase() {
  return getSupabaseClient();
}

export function db() {
  return getSupabaseClient();
}
