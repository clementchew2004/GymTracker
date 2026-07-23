# CLAUDE.md — Gym Progression Tracker

Project context for both the developer and Claude Code. Read this before making changes.

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
└── CLAUDE.md
```

## Data model (Prisma)

Four domain tables + a User for auth. This is the source of truth for the whole app —
every chart is a query over `SetEntry`.

```prisma
model User {
  id          String       @id @default(cuid())
  email       String       @unique
  password    String       // bcrypt hash, NEVER plaintext
  createdAt   DateTime     @default(now())
  sessions    Session[]
  bodyWeights BodyWeight[]
}

model Exercise {
  id             String     @id @default(cuid())
  name           String
  muscleGroup    String     // "chest", "back", "quads"...
  defaultDayType DayType?
  sets           SetEntry[]
}

model Session {
  id      String     @id @default(cuid())
  date    DateTime   @default(now())
  dayType DayType
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

enum DayType {
  PUSH
  PULL
  LEGS
  UPPER
}
```

## API surface

All routes except register/login are auth-protected. Protected routes read the user
from the JWT and scope every query with `where: { userId }` — this is the only thing
keeping users' data separate, so it must never be omitted.

| Method & path                         | Body / query                                  | Returns                    |
|---------------------------------------|-----------------------------------------------|----------------------------|
| `POST /api/auth/register`             | email, password                               | auth token                 |
| `POST /api/auth/login`                | email, password                               | auth token                 |
| `GET  /api/exercises`                 | —                                             | Exercise[]                 |
| `POST /api/exercises`                 | name, muscleGroup, defaultDayType?            | Exercise                   |
| `POST /api/sessions`                  | dayType                                        | Session                    |
| `GET  /api/sessions`                  | —                                             | the user's Session[]       |
| `POST /api/sets`                      | sessionId, exerciseId, weight, reps, rpe?     | SetEntry                   |
| `GET  /api/sessions/last?exerciseId=` | —                                             | last Session w/ that ex, or null |
| `GET  /api/bodyweight`                | —                                             | BodyWeight[]               |
| `POST /api/bodyweight`                | weightKg, date?                               | BodyWeight                 |

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

- [ ] 1. Pure logic (`estimate1RM`, weekly volume, `weeklySummary`) + Vitest tests  ← **current task**
- [ ] 2. Prisma schema + `migrate` + seed real Push/Pull/Legs/Upper exercises
- [ ] 3. Sessions & sets endpoints (test with curl before any UI)
- [ ] 4. Auth (register/login, JWT), then add `userId` scoping to all routes
- [ ] 5. Frontend: api wrappers → logging screen → "last time" panel
- [ ] 6. Charts (1RM line, weekly volume), PR badges, "beat last session"
- [ ] 7. Weekly summary screen — renders `weeklySummary()` output; surfaces automatically at week end
- [ ] 8. Polish: PWA/offline, rest timer, bodyweight tracking
- [ ] 9. Deploy (Vercel + Railway/Render + Postgres), README with screenshots, tests

## Common commands

> Fill in exact scripts as they're created. Expected shape:

```bash
# backend/
npx prisma migrate dev        # apply schema changes
npx prisma studio             # inspect the DB
npm run dev                   # start express server
npm test                      # run vitest

# frontend/
npm run dev                   # start vite dev server
```

## Working with Claude Code on this project

- Use a **local** session for building and debugging — it needs the local Postgres and dev server.
- Use a **cloud** session to hand off a self-contained chore (e.g. "add tests for lib/") and get a PR back.
- Keep this file updated as the source of truth. When a decision changes, change it here.
