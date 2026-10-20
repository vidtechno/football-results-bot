# Supabase — Manbora

Loyiha: **Manbora** (`cxuqmfvnrzsrafjhoggu`, ap-northeast-2). Ayni shu akkauntdagi `scorify-production` — boshqa loyiha, Manbora bilan aloqasi yo‘q.

## Tuzilma

| Yo‘l | Vazifasi |
|---|---|
| `migrations/011…055_*.sql` | Manbora sxemasi. Raqam tartibida qo‘llanadi. |
| `legacy/` | Boshqa loyiha ("Bog‘lanish" tashkilotlar katalogi) qoldiqlari: `schema.sql`, `seed*.sql`, `migrations/002–010`, `bank-source-audit.md`. Manbora bazasida bu jadvallar yo‘q. Qo‘llamang. |

## Migratsiya tarixi haqida ogohlantirish

- Repodagi migratsiyalar SQL Editor orqali qo‘lda qo‘llangan, shuning uchun Supabase'ning `list_migrations` natijasida ular ko‘rinmaydi.
- Shu tarixda futbol o‘yiniga oid (`leagues`, `clubs`, `transfers` …) 18 ta yozuv turibdi. Ular Manbora'ga tegishli emas va bazada mos jadvallar yo‘q.
- Yangi o‘zgarishlar uchun: `supabase/migrations/056_*.sql` fayl yarating va Supabase MCP `apply_migration` (yoki CLI `supabase db push`) orqali qo‘llang, shunda tarix to‘g‘ri yuritiladi.

## So'nggi migratsiyalar holati

| Fayl | Nima qiladi | Bazada |
|---|---|---|
| 052 `plus_admin_only_hardening` | Muallif asari hech qachon Plus bo'la olmaydi | qo'llangan |
| 053 `user_admin_state_and_admin_user_list` | Oxirgi kirish, bloklash, admin foydalanuvchilar ro'yxati (RPC) | qo'llangan |
| 054 `protect_profile_private_columns` | `profiles.email` va shaxsiy ustunlarni ommaga yopadi | **QO'LLANMAGAN** — avval kodni deploy qiling |
| 055 `author_studio_gross_sales_function` | Studiya uchun jami savdo yig'indisi | qo'llangan |

052, 053 va 055 Supabase MCP `apply_migration` orqali qo'llangan, shuning uchun ular `list_migrations` tarixida ham ko'rinadi.
