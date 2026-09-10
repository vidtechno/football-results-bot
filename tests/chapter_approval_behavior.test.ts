import { describe, expect, it, vi } from 'vitest';
import { verifyApprovedChapterPreview } from '@/lib/services/chapterApproval';
import { getPublicWorkAuthorName } from '@/lib/utils/workAttribution';

function database(results: unknown[]) {
  const client: any = {
    from: vi.fn(() => client), select: vi.fn(() => client),
    eq: vi.fn(() => client), update: vi.fn(() => client),
    single: vi.fn(async () => results.shift()),
    maybeSingle: vi.fn(async () => results.shift()),
  };
  return client;
}
const approved = (free: boolean) => ({ data: {
  chapter_id: 'chapter', status: 'approved', is_preview_free: free, reviewed_at: '2026-09-10T05:19:08Z',
}, error: null });

describe('Approved chapter preview persistence', () => {
  it.each([true, false])('repairs an old RPC result to the approved value %s', async (free) => {
    const db = database([approved(free), { data: { is_preview_free: !free } }, { data: { id: 'chapter' } }]);
    await verifyApprovedChapterPreview(db, 'revision');
    expect(db.update).toHaveBeenCalledWith({ is_preview_free: free });
    expect(db.eq).toHaveBeenCalledWith('updated_at', '2026-09-10T05:19:08Z');
  });
  it('does not write when the RPC has already applied the correct flag', async () => {
    const db = database([approved(true), { data: { is_preview_free: true } }]);
    await verifyApprovedChapterPreview(db, 'revision');
    expect(db.update).not.toHaveBeenCalled();
  });
  it('rejects pending revisions without changing the live chapter', async () => {
    const db = database([{ data: { status: 'pending_review' } }]);
    await expect(verifyApprovedChapterPreview(db, 'revision')).rejects.toThrow();
    expect(db.update).not.toHaveBeenCalled();
  });
  it.each([{ data: null }, { data: null, error: { message: 'database failure' } }])(
    'does not report success on concurrent modification or a failed write', async (result) => {
      const db = database([approved(true), { data: { is_preview_free: false } }, result]);
      await expect(verifyApprovedChapterPreview(db, 'revision')).rejects.toThrow();
    },
  );
});

it('uses the current profile name while preserving original translated attribution', () => {
  const author = { pen_name: 'Anorboyev Diyorbek', profile: { display_name: 'Manbora jamoasi' } };
  expect(getPublicWorkAuthorName({ author })).toBe('Manbora jamoasi');
  expect(getPublicWorkAuthorName({ author, is_translation: true, original_author_name: 'Claude Hopkins' })).toBe('Claude Hopkins');
});
