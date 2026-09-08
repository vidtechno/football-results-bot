import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('reader performance and visible controls', () => {
  it('uses a lightweight metadata query and parallelizes independent reader requests', () => {
    const page = read('src/app/asarlar/[slug]/[chapterSlug]/page.tsx');
    const queries = read('src/lib/db/queries.ts');
    expect(page).toContain('getChapterMetadata(params.slug, params.chapterSlug)');
    expect(queries).toContain('export async function getChapterMetadata');
    expect(queries).toContain('await Promise.all');
  });

  it('provides immediate route loading feedback', () => {
    const loading = read('src/app/loading.tsx');
    expect(loading).toContain('animate-spin');
    expect(loading).toContain('Sahifa yuklanmoqda');
  });

  it('keeps desktop contents, settings, and bookmarks visible', () => {
    const reader = read('src/components/reader/ReaderView.tsx');
    const shell = read('src/components/layout/PublicAppShell.tsx');
    const sidebar = read('src/components/layout/Sidebar.tsx');
    expect(reader).toContain('aria-label="Doimiy mundarija"');
    expect(reader).toContain('Mutolaa sozlamalari');
    expect(reader).toContain('Xatcho‘pga saqlash');
    expect(reader).toContain('hidden w-60 xl:flex');
    expect(shell).toContain('<Sidebar readerMode />');
    expect(sidebar).toContain("readerMode ? 'top-0 h-screen'");
  });
});

describe('notification unread synchronization', () => {
  it('marks dropdown items and the full notifications page as read', () => {
    const bell = read('src/components/notifications/NotificationBell.tsx');
    const status = read('src/components/notifications/NotificationsReadStatus.tsx');
    expect(bell).toContain('markItemAsRead(item.id)');
    expect(status).toContain('markAllAsRead()');
  });

  it('does not count records that already have read_at', () => {
    const api = read('src/app/api/notifications/route.ts');
    expect(api).toContain(".eq('is_read', false)");
    expect(api).toContain(".is('read_at', null)");
  });
});
