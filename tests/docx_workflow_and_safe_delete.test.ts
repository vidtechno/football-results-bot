import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('DOCX workflow and safe work deletion', () => {
  it('removes the PDF importer implementation and dependency', () => {
    expect(existsSync(join(root, 'src/app/api/admin/pdf-import/route.ts'))).toBe(false);
    expect(existsSync(join(root, 'src/lib/pdf-import'))).toBe(false);
    expect(read('package.json')).not.toContain('pdf-parse');
    expect(read('src/components/docx-import/DocxImportPanel.tsx')).toContain('.docx');
    expect(read('src/components/docx-import/DocxImportPanel.tsx')).not.toContain('application/pdf');
  });

  it('keeps parsing server-side and checks DOCX MIME, extension, limits and duplicate hashes', () => {
    const route = read('src/app/api/docx-import/route.ts');
    const parser = read('src/lib/docx-import/parser.ts');
    expect(route).toContain(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(route).toContain("endsWith('.docx')");
    expect(route).toContain('DOCX_IMPORT_MAX_BYTES');
    expect(route).toContain("createHash('sha256')");
    expect(parser).toContain('MAX_ZIP_ENTRIES');
    expect(parser).toContain('MAX_UNCOMPRESSED_BYTES');
    expect(parser).toContain('EncryptedPackage');
  });

  it('uses preview before one atomic transactional import', () => {
    const panel = read('src/components/docx-import/DocxImportPanel.tsx');
    const route = read('src/app/api/docx-import/route.ts');
    const migration = read('supabase/migrations/048_docx_import_and_safe_work_deletion.sql');
    expect(panel).toContain('Tasdiqlash va');
    expect(route).toContain("action === 'import'");
    expect(route).toContain("db.rpc('import_docx_chapters'");
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain("v_session.status = 'completed'");
    expect(migration).not.toMatch(/DELETE FROM public\.(?:purchases|wallet|entitlements)/);
  });

  it('allows approved owners or admins and denies unrelated users server-side', () => {
    const route = read('src/app/api/docx-import/route.ts');
    expect(route).toContain('work.author_id !== profile.id && !isAdmin');
    expect(route).toContain("author?.status !== 'approved'");
    expect(route).toContain('Faqat tasdiqlangan mualliflar');
  });

  it('soft-deletes every work and preserves financial/accounting relations', () => {
    const route = read('src/app/api/works/delete/route.ts');
    const studio = read('src/app/muallif/page.tsx');
    expect(route).toContain("status: 'archived'");
    expect(route).toContain('is_archived: true');
    expect(route).not.toContain(".from('purchases').delete");
    expect(route).not.toContain(".from('wallet_transactions').delete");
    expect(route).toContain('work.author_id !== profile.id && !isAdmin');
    expect(studio).toContain('Asarni o‘chirishni xohlaysizmi?');
    expect(studio).toContain('Bu amalni ortga qaytarib bo‘lmaydi.');
    expect(studio).toContain(".eq('is_archived', false)");
  });

  it('keeps deleted works out of direct pages, catalogue and sitemap', () => {
    expect(read('src/app/asarlar/[slug]/page.tsx')).toContain("work.status === 'archived'");
    expect(read('src/lib/seo/sitemapData.ts')).toContain('is_archived.eq.false');
    expect(read('src/lib/db/queries.ts')).toContain('is_archived');
  });
});
