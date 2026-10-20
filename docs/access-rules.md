# Asarlarga kirish qoidalari (kim nimani o'qiydi)

Kodda yagona manba: `src/lib/plus/rules.ts` va `src/lib/security/access.ts`.
Bazada: `chapter_contents` RLS siyosati (migratsiya 050) va triggerlar (052).

## Ikki toifa pullik asar

| | **Plus asari** (`is_plus = true`) | **Muallif asari** (oddiy) |
|---|---|---|
| Kim kiritadi | Faqat admin (admin muallif bo'lgan asar) | Mualliflar |
| Plus obunasi bor kitobxon | Hamma boblarni bepul o'qiydi | Hech qanday ta'sir qilmaydi |
| Obunasiz kitobxon | 1-bob bepul; qolganini asarni/bobni sotib olib o'qiydi | Bepul boblar bepul; qolganini sotib oladi |
| Sotuvdan tushgan pul | 80% muallifga (admin), 20% platformaga | 80% muallifga, 20% platformaga |
| Plus obuna puli (19 000 so'm / 30 kun) | To'liq platformaga | — |

## Qat'iy qoidalar
1. **Muallif asari hech qachon Plus bo'la olmaydi.** Bazadagi trigger buni rad etadi (INSERT, UPDATE, muallif almashishi). Admin huquqi olinsa, uning asarlari Plus'dan chiqariladi.
2. Plus belgisini faqat admin qo'yadi (`/diyoration/plus`, RPC `set_work_plus`).
3. To'liq bepul asar (`access_type = 'free'`, Plus emas) sotib olinmaydi.
4. Muallif o'z asarini sotib ola olmaydi; admin hamma narsani o'qiy oladi.
5. Plus narxi: `platform_settings.plus_monthly_price` (hozir 19 000). Kodda zaxira qiymat `src/lib/plus/config.ts`.
