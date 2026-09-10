import type { SupabaseClient } from '@supabase/supabase-js';

/** Compatibility with the pre-038 approval RPC; no new revision is approved here. */
export async function verifyApprovedChapterPreview(admin: SupabaseClient, revisionId: string) {
  const { data: revision, error: revisionError } = await admin
    .from('chapter_revisions')
    .select('chapter_id, status, is_preview_free, reviewed_at')
    .eq('id', revisionId)
    .single();
  if (revisionError || revision?.status !== 'approved' || !revision.reviewed_at) {
    throw new Error('Bob tasdiqlanganini tekshirib bo‘lmadi');
  }

  const { data: chapter, error: chapterError } = await admin
    .from('chapters')
    .select('is_preview_free, updated_at')
    .eq('id', revision.chapter_id)
    .single();
  if (chapterError || !chapter) throw new Error('Bobning bepul holatini tekshirib bo‘lmadi');
  if (chapter.is_preview_free === revision.is_preview_free) return;

  // The approval RPC stamps both rows in one transaction. Refuse to overwrite
  // a later edit, even if another moderator saved it while this request ran.
  const { data: repaired, error } = await admin
    .from('chapters')
    .update({ is_preview_free: Boolean(revision.is_preview_free) })
    .eq('id', revision.chapter_id)
    .eq('updated_at', revision.reviewed_at)
    .select('id')
    .maybeSingle();
  if (error || !repaired) {
    throw new Error('Bepul bob holati saqlanmadi yoki bob qayta tahrirlangan. Sahifani yangilab tekshiring.');
  }
}
