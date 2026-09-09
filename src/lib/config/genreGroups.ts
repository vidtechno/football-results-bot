export const GENRE_GROUPS = [
  {
    id: 'fiction',
    title: 'Badiiy adabiyot',
    description: 'Tuyg‘u, tasavvur va kuchli syujetlar olami',
    slugs: ['romantika', 'drama', 'detektiv', 'triller', 'fantasy', 'fantastika', 'tarixiy'],
  },
  {
    id: 'business',
    title: 'Biznes va rivojlanish',
    description: 'Kasbiy o‘sish, moliyaviy bilim va tadbirkorlik',
    slugs: ['biznes', 'marketing', 'sotuv', 'moliya', 'tadbirkorlik', 'shaxsiy-rivojlanish'],
  },
  {
    id: 'education',
    title: 'Bilim va ta’lim',
    description: 'Yangi ko‘nikmalar, fan va tafakkur uchun',
    slugs: ['it', 'ai', 'til-organish', 'talim', 'tarix', 'psixologiya', 'falsafa'],
  },
  {
    id: 'formats',
    title: 'Maxsus formatlar',
    description: 'O‘ziga xos uslub va shakldagi asarlar',
    slugs: ['sheriyat', 'qisqa-hikoya', 'biografiya', 'klassika', 'tarjima-asar'],
  },
] as const;

export type GenreGroupId = (typeof GENRE_GROUPS)[number]['id'];

export function getGenreGroupForSlug(slug: string) {
  return GENRE_GROUPS.find((group) => (group.slugs as readonly string[]).includes(slug));
}
