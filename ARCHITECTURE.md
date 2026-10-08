# Architecture — Gym Progression Tracker

How this project is put together: the data model, the API surface, and the
conventions that hold them together. Read this before making changes.

## What this is

A full-stack web app for logging gym sessions and visualising progressive overload.
Built by a second-year CS student as a portfolio/CV project and a daily-use tool.
Training style is a 4-day **Push / Pull / Legs / Upper** split with pyramid loading,
so the app is designed around that. Typical session: **3 sets per exercise** (use this
as the default when the UI pre-fills the set logger; the schema still allows any number).

The training week is the core reporting unit: log sessions across the week, then at
week end the app produces a **weekly summary** of progress vs the previous week.
All historical sessions are retained — "up to a week" refers to the summary cadence,
not data retention. Charts still show the full history.

**Primary goal:** demonstrate a real client → API → database → auth chain end to end,
not just a frontend. Keep that architecture legible; it's the point of the project.

## Tech stack

**Frontend**
- React 19, Vite 6, TypeScript 5, TailwindCSS 4
- recharts (1RM and volume charts)

**Backend**
- Node + Express + TypeScript
- Prisma ORM → PostgreSQL
- bcrypt (password hashing) + jsonwebtoken (JWT auth)

**Tooling / deploy**
- Vitest for tests
- Frontend → Vercel; Backend → Railway or Render; DB → managed Postgres (e.g. Neon)

## Repository structure

```
gym-tracker/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # data model (source of truth)
│   └── src/
│       ├── index.ts           # express server entry
│       ├── prisma.ts          # PrismaClient singleton
│       ├── lib/               # PURE LOGIC ONLY (estimate1RM, volume) — no DB, no req/res
│       ├── routes/            # express routers, one file per resource
│       └── middleware/        # auth (JWT verify)
├── frontend/
│   └── src/
│       ├── api/               # fetch wrappers, one per resource
│       ├── lib/               # shared pure logic (may mirror backend/lib)
│       ├── components/
│       └── App.tsx
└── ARCHITECTURE.md
```

## Data model (Prisma)

Four domain tables + a User for auth. This is the source of truth for the whole app —
every chart is a query over `SetEntry`.

```prisma
model User {
  id              String       @id @default(cuid())
  email           String       @unique
  password        String       // bcrypt hash, NEVER plaintext
  createdAt       DateTime     @default(now())
  plannedDayTypes String[]     @default(["PUSH", "PULL", "LEGS", "UPPER"])
  sessions        Session[]
  bodyWeights     BodyWeight[]
}

model Exercise {
  id             String     @id @default(cuid())
  name           String
  muscleGroup    String     // "chest", "back", "quads"...
  defaultDayType String[]   @default([])  // days this exercise appears on
  sets           SetEntry[]
}

model Session {
  id      String     @id @default(cuid())
  date    DateTime   @default(now())
  dayType String
  userId  String
  user    User       @relation(fields: [userId], references: [id])
  sets    SetEntry[]
}

model SetEntry {
  id         String   @id @default(cuid())
  setNumber  Int
  weight     Float
  reps       Int
  rpe        Float?
  sessionId  String
  session    Session  @relation(fields: [sessionId], references: [id])
  exerciseId String
  exercise   Exercise @relation(fields: [exerciseId], references: [id])
}

model BodyWeight {
  id       String   @id @default(cuid())
  date     DateTime @default(now())
  weightKg Float
  userId   String
  user     User     @relation(fields: [userId], references: [id])
}
```

**Day types are plain strings, not an enum.** Each user defines their own split in
`User.plannedDayTypes`, so friends on a Bro Split or Upper/Lower can use the app
without a schema change. `Exercise.defaultDayType` is an array because one exercise
(e.g. Shoulder Press) can appear on several days while keeping a single 1RM history.

## API surface

All routes except register/login are auth-protected. Protected routes read the user
from the JWT and scope every query with `where: { userId }` — this is the only thing
keeping users' data separate, so it must never be omitted.

| Method & path                         | Body / query                                  | Returns                    |
|---------------------------------------|-----------------------------------------------|----------------------------|
| `POST /api/auth/register`             | email, password                               | auth token                 |
| `POST /api/auth/login`                | email, password                               | auth token                 |
| `GET  /api/auth/me`                   | —                                             | the caller's own User       |
| `GET  /api/exercises`                 | —                                             | Exercise[]                 |
| `POST /api/exercises`                 | name, muscleGroup, defaultDayType?            | Exercise                   |
| `POST /api/sessions`                  | dayType                                        | Session                    |
| `GET  /api/sessions`                  | —                                             | the user's Session[]       |
| `POST /api/sets`                      | sessionId, exerciseId, weight, reps, rpe?     | SetEntry                   |
| `GET  /api/sessions/last?exerciseId=` | —                                             | last Session w/ that ex, or null |
| `GET  /api/bodyweight`                | —                                             | BodyWeight[]               |
| `POST /api/bodyweight`                | weightKg, date?                               | BodyWeight                 |

**PWA scope.** The app installs to a home screen and its shell is precached, so it
opens without a network. Logging still needs the server — true offline writes would
need an IndexedDB outbox plus sync-on-reconnect, deliberately deferred until after
deploy, when it can be tested on a real phone against a real URL.

**No stats endpoints.** 1RM curves and volume are computed on the frontend from the raw
sets returned by `GET /api/sessions`. Keep the math in pure functions (see below).

## Core logic (pure functions)

Write and test these FIRST — they depend on nothing.

```typescript
// Epley formula. estimate1RM(100, 1) === 100; estimate1RM(60, 10) ≈ 80
export function estimate1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

// Weekly volume per muscle group = Σ (weight × reps) grouped by muscleGroup.

// weeklySummary(sets, weekStart) — takes all a user's sets and a week-start date,
// returns a rollup of the week that just ended vs the prior week:
//   - sessionsCompleted (count, and which DayTypes were hit)
//   - volumeByMuscleGroup (this week, delta vs last week)
//   - new1RMs (per exercise where estimated 1RM exceeded prior best)
//   - beatLastSession (count of sets that improved on the same exercise's previous set)
// Weeks are Monday-to-Sunday (ISO). Pure function — no DB, no dates from `new Date()`.
// ONLY summarises completed weeks. The caller must pass a `weekStart` whose
// Sunday is in the past; if today falls inside that week, return null (or the
// caller shouldn't have invoked it). The in-progress week never gets a summary.
```

## Conventions (important — follow these)

- **Separate pure logic from data access.** Functions in `lib/` take data in and return
  data out; they never touch Prisma or req/res. DB work lives in route handlers. If a
  function does math AND hits the database, split it.
- **Components are glue.** No business logic in React components — they call `api/`
  wrappers and `lib/` functions and render results.
- **Never trust the client for identity.** Always derive `userId` from the JWT server-side,
  never from the request body.
- **No secrets in frontend code.** JWT secret, DB URL, etc. live in backend env vars only.
- **Per-set logging.** Each set is its own `SetEntry` row (chosen to match pyramid training).
  Do not collapse to per-exercise summaries without discussing — it changes the schema.
- Prefer plain functions, `type`/`interface`, and hooks over classes. This app needs no classes.

## Build order / status

Bottom-up: things that depend on nothing first, UI last.

- [x] 1. Pure logic (`estimate1RM`, weekly volume, `weeklySummary`) + Vitest tests
- [x] 2. Prisma schema + `migrate` + seed real Push/Pull/Legs/Upper exercises
- [x] 3. Sessions & sets endpoints (test with curl before any UI)
- [x] 4. Auth (register/login, JWT), then add `userId` scoping to all routes
- [x] 5. Frontend: api wrappers → logging screen → "last time" panel
- [x] 6. Charts (1RM line, weekly volume), PR badges, "beat last session"
- [x] 7. Weekly summary screen — renders `weeklySummary()` output; surfaces automatically at week end
- [x] 8. Polish: PWA (installable + cached shell), rest timer, bodyweight tracking
- [x] 9. Deploy (Vercel + Render + Neon), README with screenshots, CI

**All nine steps complete.** The app is live:
- Frontend → https://gym-tracker-eosin-nine.vercel.app (Vercel)
- Backend → https://gymtracker-prss.onrender.com (Render)
- Database → Neon Postgres

Both hosts are free tier and sleep when idle, so the first request after a quiet
spell takes 30–60s. `VITE_API_URL` is baked in at build time, so changing it on
Vercel needs a **redeploy**, not just a save — `CORS_ORIGIN` on Render is read at
runtime and takes effect on restart.

## Common commands

```bash
# backend/
npm run dev                   # tsx watch, reads .env, port 4000
npm test                      # vitest (27 tests)
npm run build                 # tsc -p tsconfig.build.json → dist/
npm start                     # prisma migrate deploy && node dist/app.js
npx prisma migrate dev        # create + apply a migration — dev branch ONLY (see below)
npx prisma studio             # browse the DB
npx prisma db seed            # 20 exercises + test@local / testpassword123

# frontend/
npm run dev                   # vite, port 5173
npm test                      # vitest (25 tests)
npm run build                 # tsc -b && vite build (emits sw.js + manifest)
npm run preview               # serve the production build on 4173
```

**Environment variables.** `backend/.env.example` and `frontend/.env.example`
list what each half needs. Backend: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`,
and `PORT` (injected by the host in production). Frontend: `VITE_API_URL`, baked
in at build time — changing it needs a rebuild, not a restart.

**Local and production use separate database branches.** They are two Neon
branches of the same project, never the same database:

| Branch | Used by           | Connection string lives in |
|--------|-------------------|----------------------------|
| `main` | production        | Render's dashboard         |
| `dev`  | local development | `backend/.env`             |

A Neon branch is a copy-on-write copy: schema, data and the
`_prisma_migrations` table all come across, so a new branch needs no migration
and no seed, and costs nothing until it diverges.

The reason this matters is `prisma migrate dev`. When it finds drift between
the migration history and the actual database it offers to **reset** — drop
everything and replay from scratch. Aimed at `main` that is real users' data
gone. (`migrate deploy`, which `npm start` runs in production, only applies
pending migrations and never resets. That asymmetry is deliberate.)

Data does not merge back. When the local copy drifts too far from reality,
reset `dev` from `main` in the Neon console and carry on; schema changes
travel the normal way, as migration files in git.

## Maintaining this document

This file is the source of truth for the project's shape — schema, API surface,
conventions and build order. When a decision changes, change it here first and
let the code follow. A convention that lives only in someone's head gets broken
by the next person to touch the file.
