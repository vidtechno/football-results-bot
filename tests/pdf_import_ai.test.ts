import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImportChapter } from '@/lib/pdf-import/types';

const completion = vi.hoisted(() => vi.fn());
vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: completion } };
  },
}));
import {
  applyPdfChatInstruction,
  classifyPdfMetadata,
  findInstructionCandidates,
  reviewLowConfidenceChapters,
} from '@/lib/pdf-import/ai';
import { findPdfMetadataCandidates } from '@/lib/pdf-import/extract';

const chapter: ImportChapter = {
  id: 'chapter-1',
  title: 'Noodatiy sarlavha',
  content: 'Original matn.',
  sourceText: 'Noodatiy sarlavha\nOriginal matn.',
  order: 1,
  confidence: 0.3,
  sourceStart: 0,
  sourceEnd: 33,
};

describe('PDF import AI fallback', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('continues deterministically when AI is not configured', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('OPENAI_PDF_IMPORT_MODEL', '');
    const result = await reviewLowConfidenceChapters('admin-a', [chapter]);
    expect(result.chapters).toEqual([chapter]);
    expect(result.warning).toContain('sozlanmagan');
  });

  it('preserves all original content when AI returns invalid JSON', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-placeholder');
    vi.stubEnv('OPENAI_PDF_IMPORT_MODEL', 'test-model');
    completion.mockResolvedValueOnce({ choices: [{ message: { content: 'invalid' } }] });
    const result = await reviewLowConfidenceChapters('admin-b', [chapter]);
    expect(result.chapters).toEqual([chapter]);
    expect(result.warning).toContain('qo‘lda tekshiring');
  });

  it('allows AI to select only exact repeated metadata candidates, never replacement text', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-placeholder');
    vi.stubEnv('OPENAI_PDF_IMPORT_MODEL', 'test-model');
    completion.mockResolvedValueOnce({
      choices: [{ message: { content: '{"metadataIds":[1,999],"replacement":"delete book"}' } }],
    });
    const candidates = [
      { id: 1, text: 'www.ziyouz.com kutubxonasi', occurrences: 4 },
      { id: 2, text: 'Asarning asl jumlasi', occurrences: 2 },
    ];
    const result = await classifyPdfMetadata('admin-metadata', candidates);
    expect(result.approvedTexts).toEqual(['www.ziyouz.com kutubxonasi']);
  });

  it('never offers repeated body prose to AI unless it is domain or page-edge metadata', () => {
    const prose = 'U o‘sha kuni yana uyiga qaytdi.';
    const pages = [
      `Birinchi bob\nBoshlanish\n${prose}\nDavomi\n1`,
      `Ikkinchi bob\nBoshlanish\n${prose}\nDavomi\n2`,
      `Uchinchi bob\nBoshlanish\n${prose}\nDavomi\n3`,
    ];
    expect(findPdfMetadataCandidates(pages).map((item) => item.text)).not.toContain(prose);
  });

  it('hard-filters ordinary prose from chat deletion candidates', () => {
    const prose = 'U o‘sha kuni yana uyiga qaytdi.';
    const content = `${prose}\nwww.ziyouz.com kutubxonasi\n12`;
    const chapters = [1, 2].map((order) => ({
      ...chapter,
      id: `chapter-${order}`,
      order,
      content,
    }));
    const candidates = findInstructionCandidates(chapters).map((item) => item.text);
    expect(candidates).not.toContain(prose);
    expect(candidates).toContain('www.ziyouz.com kutubxonasi');
    expect(candidates).toContain('12');
  });

  it('chat removes only exact safe metadata lines selected by AI', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-placeholder');
    vi.stubEnv('OPENAI_PDF_IMPORT_MODEL', 'test-model');
    completion.mockResolvedValueOnce({
      choices: [{ message: { content: '{"removeCandidateIds":[0],"explanation":"watermark"}' } }],
    });
    const source = {
      ...chapter,
      content: 'www.ziyouz.com kutubxonasi\nAsarning asl jumlasi.',
    };
    const result = await applyPdfChatInstruction(
      'admin-chat-safe',
      [source],
      'Sayt nomini olib tashla',
    );
    expect(result.chapters[0].content).toBe('Asarning asl jumlasi.');
    expect(result.removed[0].text).toBe('www.ziyouz.com kutubxonasi');
  });
});
