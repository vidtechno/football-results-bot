import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('author works can never be Manbora Plus', () => {
  it('database trigger rejects Plus for non-admin authors on insert, is_plus and author changes', () => {
    const sql = read('supabase/migrations/052_plus_admin_only_hardening.sql');
    expect(sql).toContain("RAISE EXCEPTION 'ONLY_ADMIN_WORKS_CAN_BE_PLUS'");
    expect(sql).toContain('BEFORE INSERT OR UPDATE OF is_plus, author_id ON public.works');
    expect(sql).toContain('clear_plus_when_admin_removed');
  });

  it('no author-facing API accepts an is_plus flag', () => {
    for (const file of [
      'src/app/api/works/save/route.ts',
      'src/app/api/works/delete/route.ts',
    ]) {
      expect(read(file)).not.toMatch(/is_plus|isPlus/);
    }
  });
});
