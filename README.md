# Football Results Bot (`football-results-bot`)

Toza backend Telegram bot — O‘zbekiston Superligasi va jahonning eng nufuzli futbol ligalari natijalari, taqvimi va statistikasini taqdim etuvchi bot poydevori.

Bot interfeysi to‘liq **o‘zbek tilida (lotin alifbosida)** tayyorlangan.

---

## 🛠 Texnologiyalar Steki

* **Muhit & Til**: Node.js + TypeScript (Strict mode)
* **Telegram Framework**: [grammY](https://grammy.dev/)
* **HTTP Server**: [Fastify](https://fastify.dev/) (`/health` endpoint bilan)
* **Ma’lumotlar bazasi**: Supabase PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
* **Kesh & Navbat**: Redis + [BullMQ](https://bullmq.io/)
* **Futbol ma’lumotlari provayderi**: API-Football (RapidAPI)
* **Validatsiya**: Zod
* **Test & Sifat**: Vitest, ESLint, Prettier

---

## 📁 Loyiha Tuzilmasi

```
football-results-bot/
├── docs/
│   └── architecture.md            # Tizim arxitekturasi va kesh qoidalari
├── drizzle/                       # Drizzle ORM SQL migratsiyalari
├── src/
│   ├── bot/                       # grammY bot, klaviaturalar va handlerlar
│   │   ├── handlers/              # Start va Menyu tugmalari
│   │   ├── keyboards.ts           # Doimiy o‘zbekcha reply keyboard
│   │   └── index.ts               # Bot bootstrap
│   ├── cache/                     # Redis mijoz va kesh kalitlari
│   │   ├── keys.ts
│   │   └── redis.ts
│   ├── config/                    # Zod orqali muhit o‘zgaruvchilari validatsiyasi
│   │   └── env.ts
│   ├── db/                        # Drizzle ORM ulanish, jadvallar va seed
│   │   ├── schema/                # 11 ta asosiy jadval sxemalari
│   │   ├── index.ts
│   │   ├── migrate.ts             # Migratsiya skripti
│   │   └── seed.ts                # 10 ta MVP turnir seed skripti
│   ├── jobs/                      # BullMQ navbatlari ta’rifi
│   │   └── queues.ts
│   ├── modules/                   # Xizmatlar (Competitions, Fixtures, Users)
│   │   ├── competitions/
│   │   ├── fixtures/
│   │   └── users/
│   ├── providers/api-football/    # API-Football mijoz skeleti (Faqat worker uchun)
│   │   ├── client.ts
│   │   └── types.ts
│   ├── utils/                     # Logger, konstantalar va matnlar
│   │   ├── constants.ts
│   │   └── logger.ts
│   ├── workers/                   # Sync Worker va Notification Worker
│   │   ├── syncWorker.ts
│   │   └── notificationWorker.ts
│   ├── server.ts                  # Fastify HTTP server
│   └── index.ts                   # Asosiy kirish nuqtasi
├── tests/                         # Vitest testlari
├── .env.example                   # Muhit o‘zgaruvchilari namunasi
├── drizzle.config.ts              # Drizzle Kit konfiguratsiyasi
├── package.json
└── tsconfig.json
```

---

## ⚙️ O‘rnatish va Sozlash

### 1. Repozitoriyani yuklab olish va paketlarni o‘rnatish:

```bash
npm install
```

### 2. Muhit o‘zgaruvchilarini sozlash:

`.env.example` faylidan nusxa olib `.env` yarating va tegishli qiymatlarni kiriting:

```bash
cp .env.example .env
```

Kerakli o‘zgaruvchilar:
* `BOT_TOKEN`: Telegram @BotFather dan olingan bot tokeni
* `DATABASE_URL`: Supabase PostgreSQL ulanish manzili (Connection pooler yoki Direct)
* `REDIS_HOST` / `REDIS_PORT` (yoki `REDIS_URL`): Redis ulanishi
* `API_FOOTBALL_KEY`: API-Football (RapidAPI) kaliti

---

## 🗄 Ma’lumotlar Bazasi Buyruqlari

### Migratsiyani generatsiya qilish (Drizzle Kit):
```bash
npm run db:generate
```

### Migratsiyani bazaga qo‘llash:
```bash
npm run db:migrate
```

### 10 ta asosiy MVP turnirni bazaga kiritish (Seed):
```bash
npm run db:seed
```

---

## 🧪 Sifat va Test Buyruqlari

```bash
# Kod formatini tekshirish
npm run format:check

# Avtomatik formatlash
npm run format

# ESLint orqali tekshirish
npm run lint

# TypeScript tiplarini tekshirish
npm run typecheck

# Vitest testlarini ishga tushirish
npm test

# Loyihani ishlab chiqarish uchun yig‘ish (Build)
npm run build
```

---

## 🚀 Ishga Tushirish

### Dasturchi rejimida (Dev server + Hot reload):
```bash
npm run dev
```

### Ishlab chiqarish rejimida (Production):
```bash
npm run build
npm start
```

Server ishga tushgach, holatni tekshirish uchun:
`GET http://localhost:3000/health`

---

## 🏆 MVP Turnirlar Ro‘yxati

1. 🇺🇿 **O‘zbekiston Superligasi** (Uzbekistan)
2. 🏴󠁧󠁢󠁥󠁮󠁧󠁿 **Premier League** (England)
3. 🇪🇸 **La Liga** (Spain)
4. 🇮🇹 **Serie A** (Italy)
5. 🇩🇪 **Bundesliga** (Germany)
6. 🇫🇷 **Ligue 1** (France)
7. 🇪🇺 **UEFA Champions League**
8. 🇪🇺 **UEFA Europa League**
9. 🇪🇺 **UEFA Conference League**
10. 🇸🇦 **Saudi Pro League** (Saudi Arabia)
