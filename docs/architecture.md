# Arxitektura Hujjati (Architecture Documentation)

Ushbu hujjat **Telegram Football Results Bot (`football-results-bot`)** tizimining arxitekturasi, ma’lumotlar oqimi va xavfsizlik qoidalarini belgilaydi.

---

## 1. Asosiy Arxitektura Tamoyillari

```
+------------------+         +--------------------+         +-----------------------+
|  Telegram User   | <-----> |   grammY Bot       | ------> |      Redis Cache      |
|                  |         |  (Fastify Server)  |         | (Kesh va BullMQ Queue)|
+------------------+         +--------------------+         +-----------------------+
                                       |                                ^
                                       | Cache Miss                     | Cache Warmup
                                       v                                |
                             +--------------------+                     |
                             |    Supabase DB     | <-------------------+
                             |  (PostgreSQL/ORM)  |
                             +--------------------+
                                       ^
                                       | Persistence
                             +--------------------+
                             |    Sync Worker     | <-----> |     API-Football      |
                             | (BullMQ Background)|         |     (External API)    |
                             +--------------------+
```

---

## 2. Tizim Qismlarining Vazifalari (Separation of Concerns)

### A. Telegram Bot (grammY + Fastify)
* **Vazifasi**: Telegram foydalanuvchilarining buyruqlari (`/start`) va doimiy tugmalar (`⚽ Bugungi o‘yinlar`, `🏆 Turnirlar`, `⭐ Sevimlilar` va h.k.) orqali so‘rovlarini qabul qilish va javob qaytarish.
* **Qat’iy qoida**: **Telegram bot handlerlari hech qachon to‘g‘ridan-to‘g‘ri API-Football xizmatiga so‘rov yubormaydi!**
* **Cache-First qoidasi**:
  1. Avval ma’lumot **Redis** keshidan izlanadi.
  2. Keshda mavjud bo‘lmasa (Cache Miss), **Supabase PostgreSQL** ma’lumotlar bazasidan o‘qiladi.
  3. O‘qilgan ma’lumot keyingi so‘rovlar tezkor bo‘lishi uchun ma’lum muddatga (TTL) Redis keshiga yoziladi.
* **Jonli o‘yinlar (LIVE) qoidasi**:
  * Tizimda alohida LIVE polling menyusi yo‘q.
  * Hozirda davom etayotgan o‘yinlar uchun faqat `🟢 O‘yin bo‘lmoqda` holati ko‘rsatiladi.
  * O‘yin yakunlangach, rasmiy hisob va statistika saqlanadi hamda taqdim etiladi.

### B. Sinxronizatsiya Workeri (Sync Worker / BullMQ)
* **Vazifasi**: API-Football provayderidan turnirlar, taqvimlar, o‘yin natijalari va jamoalar ma’lumotlarini reja asosida (Cron/Queue) yuklab olish.
* **Ish oqimi**:
  1. API-Football dan ma’lumotlarni qabul qiladi.
  2. Drizzle ORM orqali Supabase PostgreSQL bazasiga `upsert` qiladi.
  3. Redis keshini avtomatik yangilaydi (Cache Warmup).
  4. Yangi o‘zgarishlar (masalan, o‘yin boshlanishi yoki tugashi) bo‘yicha bildirishnoma voqealarini yaratadi.

### C. Bildirishnomalar Workeri (Notification Worker / BullMQ)
* **Vazifasi**: Foydalanuvchilarning sevimli jamoalari va o‘yinlariga oid bildirishnomalarni (boshlanish, yakuniy natija) fonda xavfsiz va tezkor tarqatish.
* Telegram API cheklovlariga (Rate limits) mos ravishda navbat orqali ishlaydi.

---

## 3. Ma’lumotlar Bazasi va Kesh Tizimi

* **Supabase PostgreSQL (Drizzle ORM)**:
  * Doimiy saqlash ombori (Source of truth).
  * Jadvallar: `users`, `competitions`, `teams`, `fixtures`, `favorite_teams`, `favorite_competitions`, `notification_preferences`, `match_subscriptions`, `notification_events`, `notification_deliveries`, `api_sync_state`.
* **Redis**:
  * Tezkor xotira (In-memory Cache).
  * BullMQ navbatlari (`api-football-sync-queue`, `notification-delivery-queue`).

---

## 4. MVP Qamrovi (10 ta Turnir)

Tizim quyidagi 10 ta asosiy chempionat va kuboklarni qo‘llab-quvvatlaydi:
1. **O‘zbekiston Superligasi** (Uzbekistan)
2. **Premier League** (England)
3. **La Liga** (Spain)
4. **Serie A** (Italy)
5. **Bundesliga** (Germany)
6. **Ligue 1** (France)
7. **UEFA Champions League** (Europe)
8. **UEFA Europa League** (Europe)
9. **UEFA Conference League** (Europe)
10. **Saudi Pro League** (Saudi Arabia)

---

## 5. Xavfsizlik va Maxfiylik

* Sirli kalitlar (`BOT_TOKEN`, `DATABASE_URL`, `API_FOOTBALL_KEY`, `REDIS_PASSWORD`) hech qachon kodga yozilmaydi.
* Barcha muhit o‘zgaruvchilari **Zod** orqali dastur ishga tushishidayoq qat’iy tekshiriladi (`src/config/env.ts`).
* `.env` fayli `.gitignore` ga kiritilgan; barcha parametr namunalari `.env.example` faylida ko‘rsatilgan.
