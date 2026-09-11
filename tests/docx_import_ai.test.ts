import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DocxChapter } from '@/lib/docx-import/types';

const completion = vi.hoisted(() => vi.fn());
vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: completion } };
  },
}));
import { analyzeDocxTechnicalIssues, applyConfirmedSuggestion } from '@/lib/docx-import/ai';

const chapter: DocxChapter = {
  id: 'chapter-1',
  title: '1-bob',
  contentHtml: '<p>Asl  matn.</p>',
  plainText: 'Asl  matn.',
  order: 1,
  confidence: 1,
};

describe('DOCX AI helper', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('does not change content when AI is unavailable', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('OPENAI_DOCX_IMPORT_MODEL', '');
    const result = await analyzeDocxTechnicalIssues('docx-user-a', [chapter]);
    expect(result.suggestions).toEqual([]);
    expect(chapter.plainText).toBe('Asl  matn.');
  });

  it('filters rewriting and accepts only conservative technical suggestions', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test');
    vi.stubEnv('OPENAI_DOCX_IMPORT_MODEL', 'test-model');
    completion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  chapterId: 'chapter-1',
                  category: 'whitespace',
                  explanation: 'Ikki bo‘shliq',
                  before: 'Asl  matn.',
                  after: 'Asl matn.',
                },
                {
                  chapterId: 'chapter-1',
                  category: 'punctuation',
                  explanation: 'Qayta yozish',
                  before: 'Asl',
                  after: 'Yangi',
                },
              ],
            }),
          },
        },
      ],
    });
    const result = await analyzeDocxTechnicalIssues('docx-user-b', [chapter]);
    expect(result.suggestions).toHaveLength(1);
    expect(chapter.plainText).toBe('Asl  matn.');
    const applied = applyConfirmedSuggestion(chapter, result.suggestions[0]);
    expect(applied.plainText).toBe('Asl matn.');
  });
});
