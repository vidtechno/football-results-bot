import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Public profile and free chapter synchronization', () => {
  it('syncs public author identity and invalidates catalogue caches', () => {
    const route = read('src/app/api/user/profile/route.ts');
    expect(route).toContain("authorUpdates.pen_name = updates.display_name");
    expect(route).toContain("revalidateTag('public-catalogue')");
    expect(route).toContain('revalidatePath(`/mualliflar/${updated.username}`)');
  });

  it('keeps public author names aligned at database level', () => {
    const migration = read('supabase/migrations/038_fix_public_author_and_free_preview.sql');
    expect(migration).toContain('CREATE TRIGGER trg_sync_author_public_name');
    expect(migration).toContain('SET pen_name = NEW.display_name');
  });

  it('reads and writes paid-work free previews through the canonical flag', () => {
    const editor = read('src/app/muallif/asar/[id]/AuthorWorkEditorClient.tsx');
    const revisions = read('src/app/api/chapters/revisions/route.ts');
    expect(editor).toContain("chap.is_preview_free");
    expect(revisions).toContain('is_preview_free: isPreviewFree');
  });

  it('applies the preview flag during both RPC and fallback approval', () => {
    const migration = read('supabase/migrations/038_fix_public_author_and_free_preview.sql');
    const adminRoute = read('src/app/api/admin/revisions-action/route.ts');
    expect(migration).toContain('is_preview_free = v_rev.is_preview_free');
    expect(adminRoute).toContain('is_preview_free: Boolean(revBefore.is_preview_free)');
  });
});
