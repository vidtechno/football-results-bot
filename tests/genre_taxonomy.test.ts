import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GENRE_GROUPS } from '@/lib/config/genreGroups';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Curated genre taxonomy', () => {
  it('keeps the requested four groups and exact ordering', () => {
    expect(GENRE_GROUPS.map((group) => group.title)).toEqual([
      'Badiiy adabiyot',
      'Biznes va rivojlanish',
      'Bilim va ta’lim',
      'Maxsus formatlar',
    ]);
    expect(GENRE_GROUPS[0].slugs).toEqual([
      'romantika',
      'drama',
      'detektiv',
      'triller',
      'fantasy',
      'fantastika',
      'tarixiy',
    ]);
  });

  it('seeds every configured genre idempotently', () => {
    const migration = read('supabase/migrations/037_curated_genre_taxonomy.sql');
    for (const group of GENRE_GROUPS) {
      for (const slug of group.slugs) expect(migration).toContain(`'${slug}'`);
    }
    expect(migration).toContain('ON CONFLICT (slug) DO UPDATE');
  });

  it('uses the same grouping in catalogue and author forms', () => {
    expect(read('src/app/janrlar/page.tsx')).toContain('GENRE_GROUPS.map');
    expect(read('src/app/muallif/asar/yangi/page.tsx')).toContain('<optgroup');
    expect(read('src/app/muallif/asar/[id]/AuthorWorkEditorClient.tsx')).toContain(
      'GENRE_GROUPS.map',
    );
  });
});
