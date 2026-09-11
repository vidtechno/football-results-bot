import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('PDF import workflow v2', () => {
  it('removes the standalone admin screen and its navigation links', () => {
    expect(existsSync(join(root, 'src/app/diyoration/pdf-import/page.tsx'))).toBe(false);
    expect(read('src/components/admin/AdminSidebar.tsx')).not.toContain('/diyoration/pdf-import');
    expect(read('src/components/admin/AdminMobileNav.tsx')).not.toContain('/diyoration/pdf-import');
  });

  it('starts admin PDF import from normal work creation and editor', () => {
    const createPage = read('src/app/muallif/asar/yangi/page.tsx');
    const serverPage = read('src/app/muallif/asar/[id]/page.tsx');
    const editor = read('src/app/muallif/asar/[id]/AuthorWorkEditorClient.tsx');
    expect(createPage).toContain("creationMode === 'pdf'");
    expect(createPage).toContain("'?pdf=1'");
    expect(createPage).toContain('{isAdmin && (');
    expect(serverPage).toContain('canUsePdfImport={isAdmin}');
    expect(editor).toContain('<PdfImportPanel');
    expect(editor).toContain("setActiveTab('pdf')");
  });

  it('queues imported books and approves every chapter as one unit', () => {
    const migration = read('supabase/migrations/047_pdf_import_workflow_and_bulk_moderation.sql');
    const moderation = read('src/app/api/admin/moderation-action/route.ts');
    expect(migration).toContain("SET status = 'pending_review'");
    expect(migration).toContain('admin_approve_work_with_chapters');
    expect(migration).toContain("SET status = 'published'");
    expect(migration).toContain("WHERE status = 'completed' AND work_id IS NOT NULL");
    expect(moderation).toContain("supabase.rpc('admin_approve_work_with_chapters'");
    expect(moderation.indexOf(".from('chapters')")).toBeLessThan(
      moderation.indexOf(".from('works')"),
    );
  });

  it('keeps AI chat history and supports recoverable chapter deletion', () => {
    const api = read('src/app/api/admin/pdf-import/route.ts');
    const deleteApi = read('src/app/api/chapters/delete/route.ts');
    const editor = read('src/app/muallif/asar/[id]/AuthorWorkEditorClient.tsx');
    expect(api).toContain("action === 'chat'");
    expect(api).toContain('chat_history: chatHistory');
    expect(deleteApi).toContain("status: 'archived'");
    expect(deleteApi).toContain('.delete()');
    expect(editor).toContain("fetch('/api/chapters/delete'");
    expect(editor).toContain(".neq('status', 'archived')");
  });
});
