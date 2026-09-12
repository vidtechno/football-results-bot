import JSZip from 'jszip';
import { splitDocxBlocks, htmlToPlainText } from '@/lib/docx-import/text';
import { describe, expect, it } from 'vitest';
import {
  inspectDocxArchive,
  isChapterPattern,
  parseDocx,
  validateDocxIntegrity,
} from '@/lib/docx-import/parser';

const xmlEscape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Paragraph = { text: string; style?: string; bold?: boolean; italic?: boolean };

async function makeDocx(paragraphs: Paragraph[], headerText = '') {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
      <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
    </Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/></w:style></w:styles>`,
  );
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>`,
  );
  zip.file(
    'word/header1.xml',
    `<?xml version="1.0" encoding="UTF-8"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>${xmlEscape(headerText)}</w:t></w:r></w:p></w:hdr>`,
  );
  const body = paragraphs
    .map(
      (p) =>
        `<w:p>${p.style ? `<w:pPr><w:pStyle w:val="${p.style}"/></w:pPr>` : ''}<w:r>${p.bold || p.italic ? `<w:rPr>${p.bold ? '<w:b/>' : ''}${p.italic ? '<w:i/>' : ''}</w:rPr>` : ''}<w:t xml:space="preserve">${xmlEscape(p.text)}</w:t></w:r></w:p>`,
    )
    .join('');
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/></w:sectPr></w:body></w:document>`,
  );
  return Buffer.from(await zip.generateAsync({ type: 'uint8array' }));
}

describe('DOCX importer', () => {
  it('keeps nested lists, tables and lower-level headings when splitting preview', () => {
    const html =
      '<h3>Izoh</h3><ul><li>A<ul><li>B</li></ul></li><li>C</li></ul><table><tr><td>D</td><td>E</td></tr></table>';
    const blocks = splitDocxBlocks(html);
    expect(blocks).toHaveLength(3);
    expect(blocks.join('')).toBe(html);
    expect(htmlToPlainText(html)).toContain('D\nE');
  });

  it('allows consecutive headings into preview so an empty chapter can be merged', async () => {
    const result = await parseDocx(
      await makeDocx([
        { text: 'Bo‘lim', style: 'Heading1' },
        { text: 'Birinchi bob', style: 'Heading2' },
        { text: 'Asl matn saqlanadi.' },
      ]),
      'Asar',
    );
    expect(result.chapters).toHaveLength(2);
    expect(result.statistics.suspiciousLoss).toBe(true);
    expect(result.chapters[1].plainText).toBe('Asl matn saqlanadi.');
  });

  it('preserves table content in an actual DOCX', async () => {
    const zip = await JSZip.loadAsync(await makeDocx([{ text: 'Boshlanish.' }]));
    const xml = await zip.file('word/document.xml')!.async('string');
    zip.file(
      'word/document.xml',
      xml.replace(
        '<w:sectPr>',
        '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Birinchi katak</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Ikkinchi katak</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr>',
      ),
    );
    const result = await parseDocx(await zip.generateAsync({ type: 'nodebuffer' }), 'Asar');
    expect(result.chapters[0].contentHtml).toContain('<table>');
    expect(result.chapters[0].plainText).toContain('Ikkinchi katak');
  });
  it('validates a real DOCX archive and rejects a renamed PDF', async () => {
    const docx = await makeDocx([{ text: 'Matn' }]);
    await expect(inspectDocxArchive(docx)).resolves.toEqual({ hasImages: false });
    await expect(inspectDocxArchive(Buffer.from('%PDF-1.7'))).rejects.toThrow(
      'INVALID_DOCX_SIGNATURE',
    );
  });

  it('uses Heading 1 and Heading 2, preserves order and basic inline formatting', async () => {
    const docx = await makeDocx(
      [
        { text: 'Birinchi bob', style: 'Heading1' },
        { text: 'Qalin matn', bold: true },
        { text: 'Ikkinchi bob', style: 'Heading2' },
        { text: 'Kursiv matn', italic: true },
      ],
      'Bu header import qilinmasin',
    );
    const result = await parseDocx(docx, 'Sinov asari');
    expect(result.chapters.map((chapter) => chapter.title)).toEqual([
      'Birinchi bob',
      'Ikkinchi bob',
    ]);
    expect(result.chapters[0].contentHtml).toContain('<strong>Qalin matn</strong>');
    expect(result.chapters[1].contentHtml).toContain('<em>Kursiv matn</em>');
    expect(result.chapters.map((chapter) => chapter.plainText).join(' ')).not.toContain('header');
    expect(result.statistics.suspiciousLoss).toBe(false);
  });

  it('detects Uzbek, Cyrillic, Roman and English chapter patterns', () => {
    [
      '1-bob',
      'II BOB',
      'BIRINCHI BOB',
      'Иккинчи боб',
      'BOB 1',
      'CHAPTER 1',
      '1. OTABEK',
      '3-bob. Yangi hayot',
      'II BOB: Boshlanish',
    ].forEach((title) => expect(isChapterPattern(title)).toBe(true));
  });

  it('falls back to one chapter when there is no reliable heading', async () => {
    const docx = await makeDocx([
      { text: 'Oddiy boshlanish.' },
      { text: 'xalqimizni va kishilarning so‘zlari o‘zgarmasin.' },
    ]);
    const result = await parseDocx(docx, 'Asl nom');
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].title).toBe('Asl nom');
    expect(result.chapters[0].plainText).toContain('xalqimizni va kishilarning');
  });

  it('rejects empty and malformed DOCX files', async () => {
    await expect(parseDocx(await makeDocx([]), 'Bo‘sh')).rejects.toThrow('EMPTY_DOCX');
    await expect(inspectDocxArchive(Buffer.from('PK broken zip'))).rejects.toThrow();
  });

  it('blocks suspicious text loss', () => {
    const chapters = [
      {
        id: 'c1',
        title: '1-bob',
        contentHtml: '<p>Birinchi</p>',
        plainText: 'Birinchi',
        order: 1,
        confidence: 1,
      },
    ];
    expect(
      validateDocxIntegrity('Birinchi va juda muhim qolgan matn', chapters, 2).suspiciousLoss,
    ).toBe(true);
  });
});
