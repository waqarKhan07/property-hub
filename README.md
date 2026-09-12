# RentHub

RentHub is a Pakistani property marketplace — find, list, and chat about rentals and sales. Built with **React 19**, **Vite 8**, **TypeScript**, **Tailwind CSS 4**, and **Supabase** (Postgres + RLS + storage).

## Prerequisites

- Node.js 20+ and npm
- A free [Supabase](https://supabase.com) account

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project**

   - Sign in at [supabase.com](https://supabase.com) and create a new project (free tier is fine).
   - Open **SQL Editor** in your project dashboard.
   - Run every file in [`supabase/migrations/`](./supabase/migrations/) **in order** (`0001_extensions.sql` → `0006_storage.sql`). Or, if you use the Supabase CLI:

     ```bash
     supabase db push
     ```

3. **Configure the app**

   Copy the template and fill in your project credentials (they're safe to share with the browser):

   ```bash
   cp .env.example .env
   ```

   Then open `.env` and set:

   - `VITE_SUPABASE_URL` — from **Settings → API → Project URL**
   - `VITE_SUPABASE_ANON_KEY` — from **Settings → API → anon public**

   > Never put your `service_role` key in a `VITE_*` variable — it would ship to the browser.

4. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:5173. The "needs a database connection" banner disappears once your `.env` has real values and the migrations have run.

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the dev server                 |
| `npm run build`   | Typecheck + production build         |
| `npm run preview` | Preview the production build         |
| `npm run typecheck` | Run the TypeScript compiler        |
| `npm run lint`    | Run ESLint                           |
| `npm run test`    | Run the Vitest unit tests            |

## Project structure

```
.
├── supabase/migrations/   # SQL schema, functions, triggers, RLS policies, storage
├── public/                # Static assets (favicon, robots.txt)
└── src/
    ├── components/        # UI primitives, layout, auth, page sections
    ├── config/            # Environment access
    ├── hooks/             # Auth, favorites, document title
    ├── lib/               # Supabase client, query builder, AI search, utils
    ├── pages/             # Route pages (auth, dashboard, inbox, admin)
    ├── types/             # Shared TypeScript types
    └── App.tsx            # Routes + route guards
```