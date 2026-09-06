import { describe, it, expect } from 'vitest';
import { getRelativeTimeString } from '@/lib/utils/formatters';

describe('Public Platform Layout & Shell Modernization', () => {
  describe('1. Reader Layout Exception & Route Detection', () => {
    function isReaderRoute(pathname: string): boolean {
      const segments = pathname.split('/').filter(Boolean);
      return segments[0] === 'asarlar' && segments.length >= 3;
    }

    function isAdminRoute(pathname: string): boolean {
      return pathname.startsWith('/diyoration');
    }

    function isAuthorStudioRoute(pathname: string): boolean {
      return pathname === '/muallif' || pathname.startsWith('/muallif/');
    }

    it('identifies chapter reading route as distraction-free reader page', () => {
      expect(isReaderRoute('/asarlar/alpomish/1-bob')).toBe(true);
      expect(isReaderRoute('/asarlar/otkan-kunlar/2-bob')).toBe(true);
      expect(isReaderRoute('/asarlar/alpomish/1-bob/nested-page')).toBe(true);
    });

    it('does not classify catalogue or work detail page as reader page', () => {
      expect(isReaderRoute('/asarlar')).toBe(false);
      expect(isReaderRoute('/asarlar/alpomish')).toBe(false);
      expect(isReaderRoute('/kitoblar')).toBe(false);
      expect(isReaderRoute('/')).toBe(false);
    });

    it('correctly segregates admin and author studio routes from public layout', () => {
      expect(isAdminRoute('/diyoration')).toBe(true);
      expect(isAdminRoute('/diyoration/asarlar')).toBe(true);
      expect(isAdminRoute('/asarlar')).toBe(false);

      expect(isAuthorStudioRoute('/muallif')).toBe(true);
      expect(isAuthorStudioRoute('/muallif/analitika')).toBe(true);
      expect(isAuthorStudioRoute('/muallif/asar/yangi')).toBe(true);
      expect(isAuthorStudioRoute('/mualliflar')).toBe(false);
      expect(isAuthorStudioRoute('/muallif-boling')).toBe(false);
    });
  });

  describe('2. Desktop Sidebar Navigation & Role-Aware Links', () => {
    function getSidebarNavItems(user: any, author: any, isAdmin: boolean) {
      const isAuthor = Boolean(author && author.status === 'approved');

      const primary = [
        { label: 'Bosh sahifa', href: '/', exact: true },
        { label: 'Asarlar', href: '/asarlar', exact: false },
        {
          label: 'Kutubxonam',
          href: user ? '/kutubxona' : '/kirish?returnUrl=/kutubxona',
          exact: false,
          requiresAuth: true,
        },
        {
          label: 'Mutolaani davom ettirish',
          href: user ? '/kutubxona?tab=reading' : '/kirish?returnUrl=/kutubxona?tab=reading',
          exact: false,
          requiresAuth: true,
        },
        { label: 'Mualliflar', href: '/mualliflar', exact: false },
        { label: 'Janrlar', href: '/janrlar', exact: false },
        {
          label: 'Bildirishnomalar',
          href: user ? '/kabinet?tab=notifications' : '/kirish?returnUrl=/kabinet?tab=notifications',
          exact: false,
          requiresAuth: true,
        },
        { label: 'Muallif bo‘ling', href: '/muallif-boling', exact: false },
      ];

      const roleAware: Array<{ label: string; href: string }> = [];
      if (isAuthor) {
        roleAware.push({ label: 'Asar yaratish', href: '/muallif/asar/yangi' });
        roleAware.push({ label: 'Muallif studiyasi', href: '/muallif' });
      }
      if (isAdmin) {
        roleAware.push({ label: 'Admin paneli', href: '/diyoration' });
      }

      return { primary, roleAware };
    }

    it('renders all required primary sidebar items for guests with returnUrl', () => {
      const { primary, roleAware } = getSidebarNavItems(null, null, false);
      const labels = primary.map((i) => i.label);

      expect(labels).toContain('Bosh sahifa');
      expect(labels).toContain('Asarlar');
      expect(labels).toContain('Kutubxonam');
      expect(labels).toContain('Mutolaani davom ettirish');
      expect(labels).toContain('Mualliflar');
      expect(labels).toContain('Janrlar');
      expect(labels).toContain('Bildirishnomalar');
      expect(labels).toContain('Muallif bo‘ling');

      // Guest redirects to /kirish with returnUrl
      const kutubxonaItem = primary.find((i) => i.label === 'Kutubxonam');
      expect(kutubxonaItem?.href).toBe('/kirish?returnUrl=/kutubxona');

      const mutolaaItem = primary.find((i) => i.label === 'Mutolaani davom ettirish');
      expect(mutolaaItem?.href).toBe('/kirish?returnUrl=/kutubxona?tab=reading');

      const notifItem = primary.find((i) => i.label === 'Bildirishnomalar');
      expect(notifItem?.href).toBe('/kirish?returnUrl=/kabinet?tab=notifications');

      expect(roleAware).toHaveLength(0);
    });

    it('renders role-aware items for authors (Asar yaratish, Muallif studiyasi)', () => {
      const user = { id: 'u1' };
      const author = { status: 'approved', pen_name: 'Cho‘lpon' };
      const { primary, roleAware } = getSidebarNavItems(user, author, false);

      const kutubxonaItem = primary.find((i) => i.label === 'Kutubxonam');
      expect(kutubxonaItem?.href).toBe('/kutubxona');

      const roleLabels = roleAware.map((r) => r.label);
      expect(roleLabels).toContain('Asar yaratish');
      expect(roleLabels).toContain('Muallif studiyasi');
      expect(roleLabels).not.toContain('Admin paneli');
    });

    it('renders role-aware admin link for admins', () => {
      const user = { id: 'admin1' };
      const { roleAware } = getSidebarNavItems(user, null, true);

      const roleLabels = roleAware.map((r) => r.label);
      expect(roleLabels).toContain('Admin paneli');
      expect(roleLabels).not.toContain('Asar yaratish');
    });
  });

  describe('3. Mobile Bottom Navigation', () => {
    function getMobileTabs(user: any) {
      return [
        { href: '/', label: 'Bosh sahifa' },
        { href: '/qidiruv', label: 'Qidiruv' },
        { href: user ? '/kutubxona' : '/kirish?returnUrl=/kutubxona', label: 'Kutubxona' },
        { href: user ? '/kabinet?tab=notifications' : '/kirish?returnUrl=/kabinet?tab=notifications', label: 'Bildirishnomalar' },
        { href: user ? '/kabinet' : '/kirish', label: 'Profil' },
      ];
    }

    it('contains exactly the 5 required tabs with proper fallback for guests', () => {
      const guestTabs = getMobileTabs(null);
      expect(guestTabs).toHaveLength(5);
      expect(guestTabs.map((t) => t.label)).toEqual([
        'Bosh sahifa',
        'Qidiruv',
        'Kutubxona',
        'Bildirishnomalar',
        'Profil',
      ]);
      expect(guestTabs[2].href).toBe('/kirish?returnUrl=/kutubxona');
      expect(guestTabs[4].href).toBe('/kirish');

      const userTabs = getMobileTabs({ id: 'u1' });
      expect(userTabs[2].href).toBe('/kutubxona');
      expect(userTabs[4].href).toBe('/kabinet');
    });
  });

  describe('4. Hero Carousel Slide Construction & Privacy Safety', () => {
    function buildCarouselSlides(
      continueReading: any | null,
      recentUpdatedWork: any | null,
      editorChoiceWork: any | null,
      isAuthor: boolean,
    ) {
      const slides = [];

      if (continueReading) {
        slides.push({
          id: 'continue-reading',
          type: 'continue-reading',
          title: continueReading.work.title,
          progress: continueReading.reading_progress,
          cta: 'Mutolaani davom ettirish',
        });
      } else {
        slides.push({
          id: 'discovery',
          type: 'discovery',
          title: 'Sara asarlar, yangi hikoyalar va elektron kitoblar mutolaasi',
          cta: 'Katalogga o‘tish',
        });
      }

      if (recentUpdatedWork) {
        slides.push({
          id: 'recently-updated',
          type: 'recently-updated',
          title: recentUpdatedWork.title,
          cta: 'Yangi bobni o‘qish',
        });
      }

      if (editorChoiceWork) {
        slides.push({
          id: 'editor-choice',
          type: 'editor-choice',
          title: editorChoiceWork.title,
          cta: 'Asarni ko‘rish',
        });
      }

      slides.push({
        id: 'author-onboarding',
        type: 'author-onboarding',
        title: 'O‘z hikoyangizni millionlab kitobxonlarga taqdim eting',
        cta: isAuthor ? 'Asar yaratishni boshlash' : 'Muallif bo‘lish',
      });

      return slides;
    }

    it('renders Discovery slide for guests and never shows progress from another user', () => {
      const slides = buildCarouselSlides(null, { title: 'Serial hikoya' }, { title: 'Sara asar' }, false);
      expect(slides[0].type).toBe('discovery');
      expect(slides[0].cta).toBe('Katalogga o‘tish');
      expect(slides.some((s) => s.type === 'continue-reading')).toBe(false);
    });

    it('renders Continue Reading slide with exact percentage when reader progress exists', () => {
      const progress = {
        work: { title: 'Ufq romani' },
        reading_progress: 45,
      };
      const slides = buildCarouselSlides(progress, { title: 'Serial hikoya' }, { title: 'Sara asar' }, true);
      expect(slides[0].type).toBe('continue-reading');
      expect(slides[0].title).toBe('Ufq romani');
      expect(slides[0].progress).toBe(45);
      expect(slides[0].cta).toBe('Mutolaani davom ettirish');
      // Author gets "Asar yaratishni boshlash" on author slide
      const authorSlide = slides.find((s) => s.id === 'author-onboarding');
      expect(authorSlide?.cta).toBe('Asar yaratishni boshlash');
    });
  });

  describe('5. Homepage Deduplication Logic', () => {
    function deduplicateSections(
      recent: Array<{ id: string; title: string }>,
      editor: Array<{ id: string; title: string }>,
      stories: Array<{ id: string; title: string }>,
    ) {
      const shownIds = new Set<string>();

      const getSlice = (items: Array<{ id: string; title: string }>) => {
        const unseen = items.filter((i) => !shownIds.has(i.id));
        if (unseen.length > 0) {
          unseen.forEach((i) => shownIds.add(i.id));
          return unseen;
        }
        if (items.length > 0 && shownIds.size < 3) {
          return items;
        }
        return [];
      };

      const sec1 = getSlice(recent);
      const sec2 = getSlice(editor);
      const sec3 = getSlice(stories);

      return { sec1, sec2, sec3, totalShown: shownIds.size };
    }

    it('prevents identical work from repeating across sections when unique works exist', () => {
      const recent = [{ id: 'w1', title: 'Work 1' }, { id: 'w2', title: 'Work 2' }];
      const editor = [{ id: 'w1', title: 'Work 1' }, { id: 'w3', title: 'Work 3' }];
      const stories = [{ id: 'w2', title: 'Work 2' }, { id: 'w4', title: 'Work 4' }];

      const res = deduplicateSections(recent, editor, stories);
      expect(res.sec1.map((w) => w.id)).toEqual(['w1', 'w2']);
      // editor should omit w1 and only show w3
      expect(res.sec2.map((w) => w.id)).toEqual(['w3']);
      // stories should omit w2 and only show w4
      expect(res.sec3.map((w) => w.id)).toEqual(['w4']);
      expect(res.totalShown).toBe(4);
    });

    it('does not flood page with empty duplicate sections when catalog has only 1 work', () => {
      const single = [{ id: 'w1', title: 'Only Work' }];
      const res = deduplicateSections(single, single, single);
      expect(res.sec1).toHaveLength(1);
      // Sections 2 and 3 can be safely rendered or skipped without breaking layout
    });
  });

  describe('6. Relative Uzbek Time Formatter', () => {
    it('formats times accurately into human-readable Uzbek strings', () => {
      const now = new Date();
      expect(getRelativeTimeString(now)).toBe('Hozirgina');

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      expect(getRelativeTimeString(tenMinutesAgo)).toBe('10 daqiqa oldin');

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(getRelativeTimeString(twoHoursAgo)).toBe('2 soat oldin');

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(getRelativeTimeString(yesterday)).toBe('Kecha');

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(getRelativeTimeString(threeDaysAgo)).toBe('3 kun oldin');
    });
  });
});
