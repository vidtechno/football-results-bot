import { createAdminClient } from '@/lib/supabase/server';

export async function hasActivePlus(userId?: string | null, customClient?: any): Promise<boolean> {
  if (!userId) return false;
  const db = customClient || createAdminClient();
  const { data } = await db
    .from('plus_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .lte('starts_at', new Date().toISOString())
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}
