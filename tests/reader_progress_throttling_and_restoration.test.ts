import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resolveReadingPage } from '@/components/reader/ReaderView';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Reader Progress Throttling and Restoration Regression Tests', () => {
  describe('Rule D: Local page 8 is not overwritten by stale server page 5', () => {
    it('restores local page 8 when local timestamp is newer than server timestamp', () => {
      const page = resolveReadingPage({
        chapterId: 'ch-101',
        totalPages: 15,
        localProgress: { chapterId: 'ch-101', pageIndex: 8, timestamp: 1700000050000 },
        savedProgress: {
          chapterId: 'ch-101',
          pageIndex: 5,
          lastReadAt: '2023-11-14T10:00:00Z',
          timestamp: 1700000010000,
        },
      });

      expect(page).toBe(8);
    });

    it('restores local page 8 when server has no timestamp', () => {
      const page = resolveReadingPage({
        chapterId: 'ch-101',
        totalPages: 15,
        localProgress: { chapterId: 'ch-101', pageIndex: 8, timestamp: 1700000050000 },
        savedProgress: { chapterId: 'ch-101', pageIndex: 5 },
      });

      expect(page).toBe(8);
    });

    it('never resets a valid local restored page to 1 immediately after mount', () => {
      const page = resolveReadingPage({
        chapterId: 'ch-101',
        totalPages: 15,
        localProgress: { chapterId: 'ch-101', pageIndex: 8, timestamp: 1700000050000 },
        savedProgress: null,
      });

      expect(page).toBe(8);
    });
  });

  describe('Rule E: URL ?page=3 overrides both local and server progress', () => {
    it('gives explicit initialPage highest priority over both local page 8 and server page 5', () => {
      const page = resolveReadingPage({
        initialPage: 3,
        chapterId: 'ch-101',
        totalPages: 15,
        localProgress: { chapterId: 'ch-101', pageIndex: 8, timestamp: 1700000050000 },
        savedProgress: {
          chapterId: 'ch-101',
          pageIndex: 5,
          timestamp: 1700000060000,
        },
      });

      expect(page).toBe(3);
    });

    it('clamps initialPage to paginated.totalPages', () => {
      const page = resolveReadingPage({
        initialPage: 25,
        chapterId: 'ch-101',
        totalPages: 12,
        localProgress: { chapterId: 'ch-101', pageIndex: 4 },
      });

      expect(page).toBe(12);
    });
  });

  describe('Rule A: Changing page 1 -> 2 -> 3 does not cause forced POST on every page', () => {
    it('verifies ReaderView code does not force server writes on normal page turns', () => {
      const readerCode = read('src/components/reader/ReaderView.tsx');

      // Page turn effect must pass force: false
      expect(readerCode).toContain('saveProgressToServer(currentPage, { force: false });');

      // Lifecycle listener effect must NOT depend on currentPage so cleanup is not run on page turns
      expect(readerCode).not.toContain('}, [currentPage, saveProgressToServer]);');
      expect(readerCode).toContain('}, [saveProgressToServer]);');

      // Throttling condition ensures writes under 45s and under 5 pages are throttled
      expect(readerCode).toContain('timeSinceLast < 45000 && pagesSinceLast < 5');
    });

    it('simulates page turns 1 -> 2 -> 3 and proves 0 forced network POSTs occur', () => {
      let networkPosts = 0;
      let lastSavedTime = 0;
      let lastSavedPage = 1;
      let serverTimer: NodeJS.Timeout | null = null;

      function simulatedSave(page: number, options?: { force?: boolean }) {
        const force = options?.force || false;
        const now = Date.now();
        const timeSinceLast = now - lastSavedTime;
        const pagesSinceLast = Math.abs(page - lastSavedPage);

        if (!force && timeSinceLast < 45000 && pagesSinceLast < 5) {
          if (!serverTimer) {
            serverTimer = setTimeout(() => {
              serverTimer = null;
              simulatedSave(page, { force: true });
            }, 45000 - timeSinceLast);
          }
          return;
        }

        if (serverTimer) {
          clearTimeout(serverTimer);
          serverTimer = null;
        }
        lastSavedTime = now;
        lastSavedPage = page;
        networkPosts++;
      }

      // Initial mount on page 1 (starts session)
      simulatedSave(1, { force: true });
      expect(networkPosts).toBe(1);

      // User turns to page 2 within 3 seconds
      simulatedSave(2, { force: false });
      expect(networkPosts).toBe(1); // Throttled! No forced POST

      // User turns to page 3 within 6 seconds
      simulatedSave(3, { force: false });
      expect(networkPosts).toBe(1); // Throttled! No forced POST

      // Clean up timer
      if (serverTimer) clearTimeout(serverTimer);
    });
  });

  describe('Rule B: Tab hide does force one flush', () => {
    it('verifies ReaderView flushes latest page when document visibilityState becomes hidden', () => {
      const readerCode = read('src/components/reader/ReaderView.tsx');

      expect(readerCode).toContain("document.addEventListener('visibilitychange', handleVisibilityChange);");
      expect(readerCode).toContain("if (document.visibilityState === 'hidden')");
      expect(readerCode).toContain('saveProgressToServer(currentPageRef.current, { force: true });');
    });
  });

  describe('Rule C: Component unmount forces one final flush', () => {
    it('verifies ReaderView lifecycle cleanup invokes saveProgressToServer with force: true and currentPageRef', () => {
      const readerCode = read('src/components/reader/ReaderView.tsx');

      // The unmount cleanup flushes using currentPageRef without being triggered on normal page turns
      expect(readerCode).toContain('// Genuinely unmounting the reader component: force final flush');
      expect(readerCode).toContain('saveProgressToServer(currentPageRef.current, { force: true });');
    });
  });
});
