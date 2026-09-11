import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('author post identity contract', () => {
  it('stores and reads posts by the authenticated author user id', () => {
    const route = read('src/app/api/author/posts/route.ts');
    const page = read('src/app/mualliflar/[username]/page.tsx');

    expect(route).toContain('author_id: profile.id');
    expect(route).not.toContain('author_id: authorProf.id');
    expect(route).toContain(".eq('user_id', userId)");
    expect(route).toContain(".eq('status', 'approved')");
    expect(page).toContain(".eq('author_id', author.user_id)");
    expect(page).not.toContain(".eq('author_id', author.id)");
  });

  it('checks direct post ownership and the real admin flag for mutations', () => {
    const route = read('src/app/api/author/posts/route.ts');

    expect(route).toContain('post.author_id !== profile.id && !profile.is_admin');
    expect(route).not.toContain(".select('role')");
    expect(route).not.toContain('author_profiles!inner(user_id)');
  });
});
