import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectChapters,
  fingerprint,
  mergeChapters,
  splitChapter,
  validateIntegrity,
} from '@/lib/pdf-import/detector';
import {
  ensureSelectableText,
  extractPdf,
  findRepeatedPageFurniture,
} from '@/lib/pdf-import/extract';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('production PDF importer', () => {
  it('extracts selectable text from a real text PDF', async () => {
    const buffer = fs.readFileSync(
      path.join(root, 'node_modules/pdf-parse/test/data/01-valid.pdf'),
    );
    const result = await extractPdf(buffer);
    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.rawText.length).toBeGreaterThan(100);
  });

  it('rejects an image-only or effectively empty PDF text layer', () => {
    expect(() => ensureSelectableText('   \n', 3)).toThrow('SCANNED_PDF');
  });

  it('flags repeated page furniture but retains it for review', () => {
    const result = findRepeatedPageFurniture(['Kitob nomi\nA', 'Kitob nomi\nB', 'Kitob nomi\nC']);
    expect(result).toEqual([{ text: 'Kitob nomi', occurrences: 3, action: 'retained' }]);
  });

  it('detects Arabic and Roman chapter headings without dropping source text', () => {
    const raw = '1-BOB\n\nBoshlanish matni.\n\nII BOB\n\nDavomi.\n\nCHAPTER III\n\nFinal.';
    const result = detectChapters(raw);
    expect(result.chapters.map((c) => c.title)).toEqual(['1-BOB', 'II BOB', 'CHAPTER III']);
    expect(validateIntegrity(raw, result.chapters, result.unassignedText).coverage).toBe(1);
  });

  it('keeps a heading-free document as one low-confidence review section', () => {
    const raw = 'Bu sarlavhasiz uzun matn. '.repeat(20);
    const result = detectChapters(raw);
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].sourceText).toBe(raw);
    expect(result.chapters[0].confidence).toBeLessThan(0.5);
  });

  it('split and merge preserve canonical source bytes', () => {
    const original = detectChapters('1-bob\n\nBirinchi qism va ikkinchi qism.').chapters[0];
    const pieces = splitChapter(original, Math.floor(original.content.length / 2));
    expect((pieces[0].sourceText || '') + (pieces[1].sourceText || '')).toBe(original.sourceText);
    expect(mergeChapters(...pieces).sourceText).toBe(original.sourceText);
  });

  it('reordering changes order only and preserves source fingerprint', () => {
    const detected = detectChapters('1-bob\n\nA.\n\n2-bob\n\nB.').chapters;
    const reordered = [detected[1], detected[0]].map((chapter, index) => ({
      ...chapter,
      order: index + 1,
    }));
    expect(reordered.map((c) => c.title)).toEqual(['2-bob', '1-bob']);
    expect(
      fingerprint(
        reordered
          .sort((a, b) => a.sourceStart - b.sourceStart)
          .map((c) => c.sourceText)
          .join(''),
      ),
    ).toBe(fingerprint(detected.map((c) => c.sourceText).join('')));
  });

  it('blocks integrity mismatch', () => {
    const raw = '1-bob\n\nMatn yo‘qolmasin.';
    const chapters = detectChapters(raw).chapters;
    chapters[0].sourceText = (chapters[0].sourceText || '').slice(1);
    expect(validateIntegrity(raw, chapters, '').coverage).toBe(0);
  });

  it('uses the established admin guard on every route method and never exposes secrets', () => {
    const route = read('src/app/api/admin/pdf-import/route.ts');
    expect(route.match(/await adminFor\(request\)/g) || []).toHaveLength(3);
    expect(route).toContain("{ error: 'Faqat administratorlar uchun' }");
    expect(route).not.toContain('NEXT_PUBLIC_OPENAI');
    expect(read('src/lib/pdf-import/ai.ts')).toContain('process.env.OPENAI_API_KEY');
  });

  it('enforces PDF magic/MIME/size and keeps deterministic fallback when AI is absent', () => {
    const route = read('src/app/api/admin/pdf-import/route.ts');
    expect(route).toContain("file.type !== 'application/pdf'");
    expect(route).toContain("!== '%PDF-'");
    expect(route).toContain('PDF_IMPORT_MAX_BYTES');
    expect(read('src/lib/pdf-import/ai.ts')).toContain('AI tahlili sozlanmagan');
  });

  it('imports drafts atomically, appends after existing chapters and never overwrites them', () => {
    const sql = read('supabase/migrations/043_admin_pdf_book_importer.sql');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.admin_import_pdf_chapters');
    expect(sql).toContain("'draft'");
    expect(sql).toContain('max(chapter_number)');
    expect(sql).not.toMatch(/DELETE FROM public\.chapters/);
    expect(sql).not.toMatch(/UPDATE public\.chapters SET/);
    expect(sql).toContain("RAISE EXCEPTION 'INVALID_CHAPTER'");
  });
});
