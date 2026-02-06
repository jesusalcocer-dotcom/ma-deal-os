// Client-side Supabase access for real-time subscriptions (Phase 2+)
// For Phase 0-1, all DB access goes through server-side API routes using Drizzle
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
