import { describe, expect, it } from 'vitest';
import { isPlusFreePreviewChapter, isWorkFullyFree } from '@/lib/plus/rules';

describe('Plus access rules', () => {
  it('treats only non-Plus free works as fully free', () => {
    expect(isWorkFullyFree({ access_type: 'free', is_plus: false })).toBe(true);
    expect(isWorkFullyFree({ access_type: 'free' })).toBe(true);
    expect(isWorkFullyFree({ access_type: 'free', is_plus: true })).toBe(false);
    expect(isWorkFullyFree({ access_type: 'paid_full_work', is_plus: false })).toBe(false);
    expect(isWorkFullyFree({ access_type: 'paid_by_chapter' })).toBe(false);
  });

  it('opens only the first chapter of a Plus work to everyone', () => {
    expect(isPlusFreePreviewChapter({ is_plus: true }, 1)).toBe(true);
    expect(isPlusFreePreviewChapter({ is_plus: true }, '1')).toBe(true);
    expect(isPlusFreePreviewChapter({ is_plus: true }, 2)).toBe(false);
    expect(isPlusFreePreviewChapter({ is_plus: false }, 1)).toBe(false);
    expect(isPlusFreePreviewChapter({}, 1)).toBe(false);
    expect(isPlusFreePreviewChapter({ is_plus: true }, null)).toBe(false);
  });
});
