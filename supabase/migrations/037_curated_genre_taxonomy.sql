-- Curated Manbora genre taxonomy. Safe to run more than once.
INSERT INTO public.genres (name, slug, description, sort_order, is_active)
VALUES
  ('Romantika', 'romantika', 'Muhabbat, munosabatlar va insoniy tuyg‘ular haqidagi asarlar', 101, true),
  ('Drama', 'drama', 'Murakkab taqdirlar, ziddiyatlar va hayotiy kechinmalar', 102, true),
  ('Detektiv', 'detektiv', 'Sir, tergov va jumboqlarga boy asarlar', 103, true),
  ('Triller', 'triller', 'Keskin voqealar va kuchli hayajon uyg‘otuvchi syujetlar', 104, true),
  ('Fantasy', 'fantasy', 'Sehr, afsona va xayoliy olamlar', 105, true),
  ('Fantastika', 'fantastika', 'Ilm-fan, kelajak va noodatiy olamlar haqidagi asarlar', 106, true),
  ('Tarixiy', 'tarixiy', 'Tarixiy davr, voqea va shaxslar haqidagi asarlar', 107, true),
  ('Biznes', 'biznes', 'Biznes boshqaruvi va amaliy ish tajribasi', 201, true),
  ('Marketing', 'marketing', 'Brend, auditoriya va bozor bilan ishlash', 202, true),
  ('Sotuv', 'sotuv', 'Savdo, muzokara va mijozlar bilan ishlash', 203, true),
  ('Moliya', 'moliya', 'Pul boshqaruvi, investitsiya va moliyaviy savodxonlik', 204, true),
  ('Tadbirkorlik', 'tadbirkorlik', 'G‘oya, startap va tadbirkorlik tajribasi', 205, true),
  ('Shaxsiy rivojlanish', 'shaxsiy-rivojlanish', 'Odatlar, maqsad va shaxsiy samaradorlik', 206, true),
  ('IT', 'it', 'Dasturlash, texnologiya va raqamli dunyo', 301, true),
  ('AI', 'ai', 'Sun’iy intellekt va zamonaviy texnologiyalar', 302, true),
  ('Til o‘rganish', 'til-organish', 'Xorijiy va ona tillarini o‘rganish', 303, true),
  ('Ta’lim', 'talim', 'O‘qitish, o‘rganish va metodik qo‘llanmalar', 304, true),
  ('Tarix', 'tarix', 'Jahon va O‘zbekiston tarixi bo‘yicha bilimlar', 305, true),
  ('Psixologiya', 'psixologiya', 'Inson ruhiyati, xulqi va munosabatlar', 306, true),
  ('Falsafa', 'falsafa', 'Tafakkur, qadriyat va hayot mazmuni', 307, true),
  ('She’riyat', 'sheriyat', 'She’rlar, g‘azallar va nazmiy to‘plamlar', 401, true),
  ('Qisqa hikoya', 'qisqa-hikoya', 'Bir o‘tirishda mutolaa qilish mumkin bo‘lgan ixcham hikoyalar', 402, true),
  ('Biografiya', 'biografiya', 'Hayot yo‘li, xotiralar va mashhur shaxslar', 403, true),
  ('Klassika', 'klassika', 'Vaqt sinovidan o‘tgan mumtoz asarlar', 404, true),
  ('Tarjima asar', 'tarjima-asar', 'Boshqa tillardan o‘zbekchaga tarjima qilingan asarlar', 405, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Preserve useful associations from earlier combined genres.
INSERT INTO public.work_genres (work_id, genre_id)
SELECT wg.work_id, target.id
FROM public.work_genres wg
JOIN public.genres old_genre ON old_genre.id = wg.genre_id
JOIN public.genres target ON target.slug IN (
  CASE old_genre.slug
    WHEN 'detektiv-va-triller' THEN 'detektiv'
    WHEN 'fantastika-va-fentezi' THEN 'fantastika'
    WHEN 'tarixiy-asarlar' THEN 'tarixiy'
    WHEN 'biznes-va-rivojlanish' THEN 'biznes'
    ELSE '__none__'
  END
)
ON CONFLICT (work_id, genre_id) DO NOTHING;

UPDATE public.genres
SET is_active = false
WHERE slug IN ('badiiy-adabiyot', 'detektiv-va-triller', 'fantastika-va-fentezi', 'tarixiy-asarlar', 'biznes-va-rivojlanish', 'diniy-marifiy');
