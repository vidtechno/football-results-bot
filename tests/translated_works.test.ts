import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('admin-curated translated works', () => {
  it('ships an idempotent schema and keeps rights evidence private', () => {
    const sql = read('supabase/migrations/026_admin_curated_translated_works.sql');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS is_translation');
    expect(sql).toContain('translation_rights_evidence');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).not.toContain('CREATE POLICY');
  });

  it('requires admin authorization and rights confirmation', () => {
    const api = read('src/app/api/admin/translated-works/route.ts');
    expect(api).toContain('verifyAdminProfile');
    expect(api).toContain('body.rightsConfirmed !== true');
    expect(api).toContain("is_translation: true");
    expect(api).toContain("status: 'draft'");
  });

  it('uses original attribution publicly and never links the uploader profile', () => {
    const helper = read('src/lib/utils/workAttribution.ts');
    const detail = read('src/app/asarlar/[slug]/page.tsx');
    expect(helper).toContain('work.original_author_name');
    expect(helper).toContain('if (work.is_translation) return null');
    expect(detail).toContain("getPublicWorkAuthorUsername(work)");
    expect(detail).not.toContain('translation_rights_evidence');
  });

  it('provides separate reader and admin sections', () => {
    expect(read('src/app/tarjima-asarlar/page.tsx')).toContain('isTranslation: true');
    expect(read('src/app/diyoration/tarjima-asarlar/page.tsx')).toContain('/api/admin/translated-works');
    expect(read('src/components/layout/Sidebar.tsx')).toContain('/tarjima-asarlar');
  });
});
