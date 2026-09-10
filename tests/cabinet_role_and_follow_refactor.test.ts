import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('reader-first cabinet and role-aware navigation', () => {
  it('keeps the private dashboard separate from account settings', () => {
    const cabinet = read('src/app/kabinet/KabinetClient.tsx');
    const settings = read('src/app/sozlamalar/page.tsx');
    const cabinetPage = read('src/app/kabinet/page.tsx');
    expect(cabinet).toContain("mode?: 'dashboard' | 'settings'");
    expect(settings).toContain('mode="settings"');
    expect(cabinetPage).toContain('redirect(`/sozlamalar?tab=${tab}`)');
  });

  it('shows the core reader collections and followed authors on the dashboard', () => {
    const cabinet = read('src/app/kabinet/KabinetClient.tsx');
    expect(cabinet).toContain('Mutolaani davom ettirish');
    expect(cabinet).toContain('Mening kutubxonam');
    expect(cabinet).toContain('Saqlangan xatcho‘plar');
    expect(cabinet).toContain('Kuzatayotgan mualliflar');
    expect(cabinet).toContain('Oxirgi hisob operatsiyalari');
  });

  it('exposes author tools only to an approved author role', () => {
    const sidebar = read('src/components/layout/Sidebar.tsx');
    const cabinet = read('src/app/kabinet/KabinetClient.tsx');
    expect(sidebar).toContain("author && author.status === 'approved'");
    expect(sidebar).toContain("author?.status === 'pending'");
    expect(cabinet).toContain("author && author.status === 'approved'");
    expect(cabinet).toContain('Asar yaratish');
    expect(cabinet).toContain('Ommaviy profil');
  });
});

describe('author follow integrity and public profile', () => {
  it('rejects unapproved author targets in both API and database', () => {
    const followRoute = read('src/app/api/social/follow/route.ts');
    const migration = read('supabase/migrations/042_enforce_approved_author_follows.sql');
    expect(followRoute).toContain("targetAuthor.status !== 'approved'");
    expect(migration).toContain("ap.status = 'approved'");
    expect(migration).toContain('NEW.user_id = NEW.author_id');
  });

  it('lists followed authors without one query per author', () => {
    const route = read('src/app/api/cabinet/following-authors/route.ts');
    expect(route).toContain('await Promise.all');
    expect(route).toContain(".in('user_id', ids)");
    expect(route).toContain(".in('author_id', ids)");
  });

  it('provides clickable followers and following statistics', () => {
    const page = read('src/app/mualliflar/[username]/page.tsx');
    const connections = read('src/components/author/AuthorConnections.tsx');
    expect(page).toContain('AuthorConnections');
    expect(page).toContain('followingCount');
    expect(connections).toContain("type: 'followers' | 'following'");
  });

  it('keeps recent chapters off the public profile and shows private cabinet data only to its owner', () => {
    const page = read('src/app/mualliflar/[username]/page.tsx');
    const ownerPanel = read('src/components/author/AuthorOwnerPanel.tsx');
    expect(page).not.toContain('So‘nggi chiqqan boblar');
    expect(page).not.toContain(".from('chapters')");
    expect(page).toContain('isOwnProfile && <AuthorOwnerPanel />');
    expect(ownerPanel).toContain('Faqat sizga ko‘rinadi');
    expect(ownerPanel).toContain('Mutolaani davom ettirish');
    expect(ownerPanel).toContain('Mening kutubxonam');
  });

  it('routes approved authors to their own profile and exposes ordered owner actions', () => {
    const sidebar = read('src/components/layout/Sidebar.tsx');
    const navbar = read('src/components/layout/Navbar.tsx');
    const page = read('src/app/mualliflar/[username]/page.tsx');
    expect(sidebar).toContain('`/mualliflar/${profile.username}`');
    expect(sidebar).toContain('href={cabinetHref}');
    expect(navbar).toContain('href={cabinetHref}');
    expect(page).toContain('Muallif studiyasi');
    expect(page).toContain('Asar yaratish');
    expect(page).toContain('Profilni tahrirlash');
  });

  it('links every work detail to its public author profile', () => {
    const workPage = read('src/app/asarlar/[slug]/page.tsx');
    expect(workPage).toContain('Muallif profilini ko‘rish');
    expect(workPage).toContain('href={`/mualliflar/${authorUsername}`}');
  });
});

describe('streak runtime removal', () => {
  it('removes the streak endpoint and widget while retaining progress milestones', () => {
    expect(fs.existsSync(path.join(root, 'src/app/api/reader/streak/route.ts'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'src/components/cabinet/ReadingStreakCard.tsx'))).toBe(
      false,
    );
    const migration = read('supabase/migrations/041_remove_streak_runtime.sql');
    expect(migration).toContain('chapter_read_milestones');
    expect(migration).toContain('work_read_completions');
    expect(migration).not.toContain('INSERT INTO public.reading_daily_activity');
  });
});
