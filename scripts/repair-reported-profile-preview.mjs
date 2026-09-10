// Scoped repair for the two user-reported records. Dry-run unless --apply is passed.
import { createClient } from '@supabase/supabase-js';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });
const apply = process.argv.includes('--apply');
const authorId = 'fb395f76-4626-4c7a-910b-3d4ac2ca5cf4';
const chapterId = '1cc6a2f7-00bb-4634-a246-08a225930f2b';
const check = (result) => { if (result.error) throw result.error; return result.data; };
const profile = check(await db.from('profiles').select('display_name').eq('id', authorId).single());
const author = check(await db.from('author_profiles').select('pen_name').eq('user_id', authorId).single());
const revision = check(await db.from('chapter_revisions')
  .select('id,is_preview_free,reviewed_at').eq('chapter_id', chapterId)
  .eq('status', 'approved').order('reviewed_at', { ascending: false }).limit(1).single());
const chapter = check(await db.from('chapters').select('is_preview_free,updated_at').eq('id', chapterId).single());
console.log({ apply, oldName: author.pen_name, newName: profile.display_name, chapter, revision });
if (apply) {
  if (author.pen_name !== profile.display_name) {
    const changed = check(await db.from('author_profiles')
      .update({ pen_name: profile.display_name, updated_at: new Date().toISOString() })
      .eq('user_id', authorId).eq('pen_name', author.pen_name).select('user_id').single());
    console.log('Public author updated:', Boolean(changed));
  }
  if (chapter.is_preview_free !== revision.is_preview_free) {
    const changed = check(await db.from('chapters').update({ is_preview_free: revision.is_preview_free })
      .eq('id', chapterId).eq('updated_at', revision.reviewed_at).select('id,is_preview_free').single());
    console.log('Approved preview restored:', changed);
  }
}
