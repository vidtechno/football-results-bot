import fs from 'node:fs';
import path from 'node:path';

/** `src/lib/db/` modullarining birlashtirilgan matni (queries.ts endi faqat qayta eksport qiladi). */
export function readDbQueries(root = process.cwd()): string {
  const dir = path.join(root, 'src/lib/db');
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.ts'))
    .sort()
    .map((name) => fs.readFileSync(path.join(dir, name), 'utf8'))
    .join('\n');
}
