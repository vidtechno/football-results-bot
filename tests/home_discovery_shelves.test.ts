import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Homepage discovery shelves', () => {
  it('shows at most six cards and routes every shelf to a catalogue filter', () => {
    const home = read('src/app/page.tsx');
    const tabs = read('src/components/home/HomeDiscoveryTabs.tsx');
    for (const collection of [
      'eng_kop_oqilgan',
      'bestseller',
      'kitobxonlar_sevgan',
      'yaqinda_yangilangan',
    ]) {
      expect(home).toContain(`collection=${collection}`);
    }
    expect(home).toContain('collection=15_daqiqa&type=serialized_story');
    expect(tabs).toContain('works.slice(0, 6)');
    expect(tabs).toContain('lg:grid-cols-6');
  });

  it('maintains read and sales ranks without homepage aggregate queries', () => {
    const migration = read('supabase/migrations/039_discovery_ranking_counters.sql');
    expect(migration).toContain('unique_readers_count');
    expect(migration).toContain('sales_count');
    expect(migration).toContain('trg_refresh_work_readers');
    expect(migration).toContain('trg_refresh_work_sales');
    expect(migration).toContain('refresh_work_reader_count');
    expect(migration).toContain('refresh_work_sales_count');
  });
});
