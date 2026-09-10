import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Kitob va hikoya turlari', () => {
  it('hikoyalarni alohida katalog sifatida menyu va footerda ko‘rsatadi', () => {
    expect(read('src/components/layout/Sidebar.tsx')).toContain("href: '/hikoyalar'");
    expect(read('src/components/layout/Footer.tsx')).toContain('href="/hikoyalar"');
  });

  it('hikoyalar katalogini faqat hikoya turidan oladi', () => {
    const page = read('src/app/hikoyalar/page.tsx');
    expect(page).toContain("type: 'serialized_story'");
    expect(page).toContain('<span>Hikoyalar</span>');
  });

  it('bosh sahifada hikoyalar uchun kafolatlangan alohida qator ajratadi', () => {
    const home = read('src/app/page.tsx');
    expect(home).toContain('const section4Works = quickStoryWorks');
    expect(home).toContain('Tez o‘qiladigan hikoyalar');
    expect(home).toContain('collection=15_daqiqa&type=serialized_story');
  });

  it('asar kartochkalarida Kitob yoki Hikoya badgesini chiqaradi', () => {
    const card = read('src/components/work/WorkCard.tsx');
    expect(card).toContain("work.type === 'serialized_story'");
    expect(card).toContain("{isStory ? 'Hikoya' : 'Kitob'}");
  });

  it('muallif yaratish va sozlamalarda ikki turni ham saqlaydi', () => {
    for (const file of [
      'src/app/muallif/asar/yangi/page.tsx',
      'src/app/muallif/asar/[id]/AuthorWorkEditorClient.tsx',
    ]) {
      const source = read(file);
      expect(source).toContain('<option value="book">Kitob</option>');
      expect(source).toContain('<option value="serialized_story">Hikoya</option>');
    }
  });
});
