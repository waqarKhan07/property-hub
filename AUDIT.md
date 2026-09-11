# RentHub — Full Codebase Audit

**Date:** 2026-09-11
**Scope:** Every file in the project — frontend (React 19, Vite 8, Tailwind 4, TypeScript 6), backend (Supabase: 6 SQL migrations, RLS, PL/pgSQL functions, storage policies)
**Codebase size:** 65 source files, ~8,200 lines of application code, 5 SQL migration files (~1,050 lines)

---

## Executive summary

RentHub is a well-structured property rental marketplace MVP. The SQL backend is production-grade: RLS is enabled on every table, column-level security prevents email/role leakage, admin functions have audit trails, and the storage layer is properly scoped. The frontend is clean, consistently styled, and responsive.

The main gaps are: **no tests**, **no error boundaries**, **no page titles/meta**, **a duplicate-query performance issue with favorites**, and **no rate limiting on the view counter or client-side mutations**. Nothing blocking a launch, but all should be addressed before scaling.

---

## 1. Security

### 1.1 SQL / Row-Level Security — GOOD

| Area | Status | Notes |
|------|--------|-------|
| RLS enabled on all 11 tables | ✅ | Correct |
| Column-level revocations | ✅ | `email` revoked from SELECT for anon/authenticated. `role`, `verification_status`, counters revoked from UPDATE. |
| Owner-only property CRUD | ✅ | Policies check `owner_id = auth.uid()`, admin override via `is_admin()` |
| Conversation participant checks | ✅ | SELECT/INSERT/UPDATE all verify `user_one_id = auth.uid() OR user_two_id = auth.uid()` |
| Visit request access | ✅ | Select: requester OR property owner OR admin. Insert: requester must be active non-owner. |
| Favorites: prevent self-favorite | ✅ | INSERT policy checks `p.owner_id <> auth.uid()` and `p.status = 'active'` |
| Notifications: user-only | ✅ | All operations scoped to `user_id = auth.uid()` |
| Reports: admin-gated update/delete | ✅ | Only admins can modify report status |
| Storage policies | ✅ | Public read, owner-scoped write via `storage.foldername(name)[1] = auth.uid()::text` |
| Admin functions (`admin_set_role`, etc.) | ✅ | All check `is_admin()`, log to `admin_actions` audit trail |
| `promote_to_owner()` | ✅ | Self-service, only promotes from `user` → `owner`, no escalation beyond that |
| PL/pgSQL `set search_path = public` | ✅ | All functions — prevents search-path injection |

### 1.2 Security issues found

**[HIGH] View counter has no rate limiting**
`src/pages/PropertyDetailsPage.tsx:454` calls `supabase.rpc("increment_property_view")` on every page load. The DB function (`0003_functions.sql:166`) updates unconditionally. Any bot or script can inflate view counts to arbitrary values.
- **Fix:** Add a client-side debounce, or implement server-side rate limiting (e.g., 1 increment per IP per property per hour via a junction table or pg function with timestamp check).

**[MEDIUM] No client-side rate limiting on mutations**
Favorite toggle, message send, visit requests, and report submissions have no throttling. A user could spam hundreds of requests.
- **Fix:** Add optimistic UI with cooldown timers on buttons, or implement server-side rate limiting via Edge Functions or database triggers.

**[LOW] `increment_property_view` callable by anon**
The function has no `auth.uid()` check. Anonymous users (and bots) can inflate counts. Not a data-leak risk, but affects data integrity.

### 1.3 Client-side auth — GOOD

- `AuthProvider` manages session + profile via `onAuthStateChange`, correctly unsubscribes on cleanup.
- Profile fetch uses explicit column whitelist — never selects `email` from DB (email comes from `session.user.email`).
- `RequireAuth` → `RequireOwner` → `RequireAdmin` route guards are correctly layered with proper redirects and `from` state restoration.
- Password reset flow is clean: email → link → session check → update → signOut → redirect.
- `supabase.auth.signUp` passes `emailRedirectTo` pointing to the app — correct.

### 1.4 XSS — GOOD

- No `dangerouslySetInnerHTML` anywhere.
- All user content rendered via JSX (auto-escaped).
- `video_url` rendered as `<video src={...}>` — React escapes the attribute value. Risk is limited to pointing to a malicious video host, which is inherent to the feature.
- `aria-label` attributes use user content — safe in HTML attributes.

### 1.5 CSRF — NOT APPLICABLE

Supabase client uses JWT in `Authorization` header, not cookies. CSRF is not a concern.

---

## 2. Correctness — Bugs & Logic Issues

### 2.1 BUG: Admin dashboard "Owners & agents" count is always 0

**File:** `src/pages/admin/AdminDashboardPage.tsx:28-48`

```js
const [profiles] = await Promise.all([
  supabase.from("profiles").select("id, role", { count: "exact", head: true }),
  // ...
]);
const all = profiles.data ?? []; // ← empty array, head:true returns no rows
setStats({
  owners: all.filter(p => p.role === "owner" || p.role === "admin").length, // ← always 0
});
```

`head: true` tells Supabase to return only the count header, no row data. But the code then tries to iterate `profiles.data` (which is `[]`) to count owners.

**Fix:** Remove `head: true` and use `select("id, role")` to actually fetch the rows, OR add a separate RPC/database function to count owners.

### 2.2 BUG: Search page title is misleading without listing_type filter

**File:** `src/pages/SearchPage.tsx:298`

```js
const title = filters.city
  ? `Properties for ${filters.listing_type === "sale" ? "sale" : "rent"} in ${filters.city}`
  : `Properties for ${filters.listing_type === "sale" ? "sale" : "rent"}`;
```

When no `listing_type` is in the URL, `filters.listing_type` is `undefined`, so the title always says "Properties for rent" — but the query (`buildPropertyQuery`) doesn't filter by listing type, so both rent AND sale listings are shown.

**Fix:** Add a third case: `filters.listing_type ? (filters.listing_type === "sale" ? "sale" : "rent") : "rent or sale"`.

### 2.3 BUG: Owner viewing own listing increments view count

**File:** `src/pages/PropertyDetailsPage.tsx:452-454`

```js
if (p && !countedView.current) {
  countedView.current = true;
  supabase.rpc("increment_property_view", { property: id }).then(() => {}, () => {});
}
```

No check for `isOwner`. Owners viewing their own listings inflate their view counts.

**Fix:** Add `if (p && !countedView.current && p.owner_id !== session?.user.id)`.

### 2.4 MINOR: `ScheduleVisitModal` default date flicker

Line 200 initializes `date` to `inThreeMonthsISO()`, then the `useEffect` on line 212 resets it to `todayISO()` when the modal opens. Users may briefly see the wrong default.

**Fix:** Initialize `date` state to `todayISO()`.

### 2.5 MINOR: Favorites page redundant JS filter

**File:** `src/pages/FavoritesPage.tsx:31`

The `.filter(p => p.status === "active")` is redundant — RLS already ensures only active properties are visible through the join. Harmless but unnecessary.

---

## 3. Performance

### 3.1 CRITICAL: `useFavorites` called per PropertyCard — N duplicate queries

**Files:** `src/components/PropertyCard.tsx:10`, `src/hooks/useFavorites.ts`

Every `PropertyCard` instance calls `useFavorites()`, which runs its own `load()` effect that queries `SELECT property_id FROM favorites WHERE user_id = ...`. On the search page with 18 cards, this fires **18 identical database queries**.

**Fix:** Lift favorites to a context provider (e.g., `FavoritesProvider`) at the `RootLayout` level, or pass favorites as props from the parent. The hook should read from a single shared state.

### 3.2 MEDIUM: `scroll-behavior: smooth` conflicts with ScrollToTop

**File:** `src/index.css:35`

```css
html { scroll-behavior: smooth; }
```

`ScrollToTop` calls `window.scrollTo(0, 0)` on route change, which now animates smoothly instead of jumping. This causes a visible scroll-up animation when navigating between pages.

**Fix:** Remove `scroll-behavior: smooth` from the base layer, or use `window.scrollTo({ top: 0, behavior: 'instant' })` in `ScrollToTop`.

### 3.3 LOW: No image optimization pipeline

`PropertyImage` renders a single `<img>` tag with no `srcset` or responsive sizing. Images are served as JPEG at whatever size the client compressed them to (max 1600px). For list views with many cards, this means downloading large images that are displayed small.

**Fix:** Consider generating thumbnails on upload (e.g., 400px, 800px) or using Supabase image transformations.

### 3.4 LOW: `MyPropertiesPage` loads all owner properties without pagination

If an owner has hundreds of listings, the entire set loads in one query. Fine for MVP, should paginate before scale.

### 3.5 LOW: Chat loads last 200 messages without pagination

**File:** `src/pages/inbox/ChatThreadPage.tsx:48`

`.limit(200)` means older messages in active conversations are lost. Should add infinite scroll upward.

---

## 4. Accessibility

### 4.1 GOOD

- Form inputs use `label` + `htmlFor` + `aria-invalid` + `aria-describedby` for error messages.
- All interactive elements are proper `<button>` or `<a>` (via `<Link>`).
- Skeleton loaders use `aria-hidden="true"`.
- `prefers-reduced-motion` is handled globally — all animations are disabled.
- `MobileNav` uses semantic `<nav>` with `aria-label`.
- Avatar menu uses `aria-haspopup="menu"` and `aria-expanded`.
- Chat uses `aria-label` on the composer and send button.

### 4.2 Issues

**[MEDIUM] No focus trap in Modal**

**File:** `src/components/ui/Modal.tsx`

When a modal opens, Tab key can move focus behind the overlay to elements in the main page. Screen reader users and keyboard-only users can interact with hidden content.

**Fix:** Implement a focus trap (trap Tab within the modal, return focus to trigger on close). Consider using `@headlessui/react` Dialog or a lightweight focus-trap library.

**[MEDIUM] Gallery zoom has no keyboard support**

**File:** `src/pages/PropertyDetailsPage.tsx:81-105`

The fullscreen image viewer has no Escape key handler, no arrow key navigation between images, and no focus management.

**Fix:** Add `useEffect` for Escape key, arrow keys for prev/next, and auto-focus the close button.

**[LOW] No skip-to-content link**

Keyboard users must tab through the entire header and navigation on every page load before reaching main content.

**Fix:** Add `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>` as the first element in `RootLayout`, and add `id="main-content"` to the `<main>`.

**[LOW] No dynamic `<title>` or meta descriptions**

Only `PropertyDetailsPage` updates `document.title`. All other pages show the default "RentHub" title. Bad for SEO and browser tab identification.

**Fix:** Add a `<title>` update in each page component or use a small `useDocumentTitle` hook.

**[LOW] FavoritesPage and MyVisitsPage use raw `<button>` for empty state actions**

These bypass the `Button` component, losing consistent styling, focus styles, and the `active:scale` micro-interaction.

**Fix:** Replace with `<Button>` and wrap in `<Link>`.

---

## 5. Responsiveness

### 5.1 GOOD

- `container-app` utility provides consistent horizontal padding (`px-4 sm:px-6 lg:px-8`).
- Mobile bottom nav is hidden on `lg:` breakpoint.
- Dashboard layout uses `lg:grid-cols-[240px_1fr]` — stacks on mobile.
- PropertyWizard step indicator scrolls horizontally on mobile (`no-scrollbar` + `overflow-x-auto`).
- Search page filter panel is a slide-up bottom sheet on mobile.
- Chat thread has `pb-20` on mobile to clear the bottom nav, `sm:px-0` for side padding.
- PropertyDetailsPage sidebar is hidden on mobile with a 2-button mobile action bar.
- Footer has `pb-20 lg:pb-0` for bottom nav clearance.
- MobileNav uses `env(safe-area-inset-bottom)` for iPhone notch.
- Modal uses `items-end` on mobile (bottom sheet) and `items-center` on `sm:` (centered).
- Header mobile drawer toggles correctly.

### 5.2 Minor issues

- `PropertyWizard` step labels are hidden on mobile (`hidden sm:inline`) — only numbers shown. This is intentional for space, but users may not know which step they're on.
- `All Properties` nav link is missing in the mobile drawer (only "Rent", "Buy", "List Property"). The desktop header has it.

---

## 6. Code Quality

### 6.1 GOOD

- Clean folder structure: `components/`, `pages/`, `hooks/`, `lib/`, `types/`, `config/`, `supabase/migrations/`.
- Consistent naming: PascalCase for components/pages, camelCase for hooks/utilities.
- TypeScript strict mode enabled with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- ESLint configured with recommended rules + react-hooks + react-refresh.
- Zod validation for the property wizard with per-step schemas.
- Custom `cn()` utility instead of clsx/twMerge (simpler, sufficient).
- `error` and `loading` states handled consistently across all pages.
- Optimistic UI in chat (messages appear immediately, removed on failure).
- Optimistic favorites toggle with rollback on error.

### 6.2 Issues

**[HIGH] No tests whatsoever**

There are zero test files in the entire project. No unit tests, no component tests, no integration tests, no e2e tests. For a marketplace app handling user data, financial listings, and chat, this is a significant gap.

**Fix priorities:**
1. Unit tests for `aiSearch.ts` (natural language parsing — complex logic)
2. Unit tests for `utils.ts` (formatting functions)
3. Component tests for `PropertyWizard` (multi-step form with Zod validation)
4. Component tests for `SearchPage` (filter → URL sync → query → results)
5. Integration tests for auth flow (register → login → promote → list)
6. E2e tests for critical paths (search → property details → contact owner → chat)

**[MEDIUM] No error boundaries**

If a lazy-loaded chunk fails to load (network error) or a runtime error occurs in any component, the entire app crashes to a blank white screen with no recovery path.

**Fix:** Add a top-level `ErrorBoundary` in `RootLayout` that shows a fallback UI with a "Try again" button. Consider per-route boundaries for the dashboard.

**[MEDIUM] Duplicated status maps across 3 files**

`statusTone: Record<VisitStatus, ...>` is defined identically in:
- `src/pages/dashboard/OwnerDashboardPage.tsx:32`
- `src/pages/dashboard/OwnerVisitsPage.tsx:17`
- `src/pages/MyVisitsPage.tsx:12`

Similarly, `statusLabel: Record<PropertyStatus, ...>` appears in `MyPropertiesPage.tsx:29`.

**Fix:** Extract to `src/lib/constants.ts` alongside the existing `visitStatusLabels`.

**[LOW] Unused type: `SavedSearch`**

**File:** `src/types/index.ts:162-167`

`SavedSearch` interface is defined but never imported or used anywhere. The `saved_searches` table exists in the DB with RLS policies, but no UI or client code uses it.

**Fix:** Remove the type, or add a `// TODO: implement saved searches` comment.

**[LOW] `image` selection uses `select-none` globally**

**File:** `src/index.css:50`

```css
img { @apply select-none; }
```

This prevents all image selection, which is generally fine for a marketplace, but could be surprising if users want to copy image URLs.

**[LOW] No `robots.txt` or `sitemap.xml`**

No SEO files exist. Should be added before public launch.

---

## 7. Architecture

### 7.1 Strengths

- **Supabase as BaaS** — All business logic lives in PL/pgSQL functions with `security definer`. The frontend never directly manipulates privileged columns. This is a strong security boundary.
- **Code splitting** — All 20 page components are lazy-loaded. Main chunk is 495 kB / 144 kB gzip. Reasonable for a full SPA.
- **Design system** — Consistent `Badge`, `Button`, `Card`, `Input`, `Select`, `Textarea`, `Modal`, `Skeleton`, `EmptyState` components with proper variant/size APIs.
- **Single source of truth** — Constants (cities, property types, amenities) in `constants.ts`, types in `types/index.ts`, Supabase client in one file.
- **Auth architecture** — `AuthProvider` → `useAuth()` context → `RequireAuth/Owner/Admin` route guards. Clean and composable.

### 7.2 Weaknesses

- **No state management beyond React state** — Favorites, notifications, and unread message counts are fetched independently per page. A lightweight global state (Zustand or React context) for cross-cutting concerns would reduce redundant queries.
- **No service worker / offline support** — The app is fully online-dependent. A basic service worker for static assets would improve perceived performance.
- **No internationalization (i18n)** — All strings are hardcoded in English. The PKR currency and Pakistani cities suggest a Pakistan-focused audience, but i18n should be considered for growth.

---

## 8. Database schema review

### 8.1 Strengths

- Proper use of `uuid` primary keys with `gen_random_uuid()`.
- Foreign keys with `ON DELETE CASCADE` where appropriate (e.g., deleting a property cascades to favorites, conversations, messages, visits).
- CHECK constraints on critical columns: `price >= 0`, `bedrooms between 0 and 50`, `char_length(title) between 3 and 200`, `guests between 1 and 20`, `char_length(content) between 1 and 5000`.
- Unique constraints: `favorites(user_id, property_id)`, `conversations(property_id, user_one_id, user_two_id)`.
- Comprehensive indexing: trigram indexes on `title`, `city`, `area` for text search; composite indexes for common query patterns.
- Automatic `updated_at` triggers on all mutable tables.
- `handle_new_user` trigger creates profile on signup.
- `sync_favorite_count` trigger maintains denormalized counter.
- `on_message` trigger updates `last_message_at` and sends notifications.
- `expire_listings()` function ready for pg_cron scheduling.

### 8.2 Issues

**[LOW] `properties.description` has no length constraint**

`description text not null default ''` — could accept arbitrarily large text. The wizard validates min 20 chars client-side, but no DB-level max.

**Fix:** Add `check (char_length(description) between 0 and 10000)` or similar.

**[LOW] `reports.target_id` is `uuid` but unconstrained**

The `target_id` could point to any UUID — there's no FK constraint (intentional, since it can reference either `properties` or `profiles`). But there's also no CHECK to verify the target exists. Orphaned reports are possible if a property/user is deleted.

**[LOW] No index on `properties.slug`**

The `slug` column is set by `publish_property()` but there's no unique index or lookup index on it. If slug-based URLs are planned, an index is needed.

---

## 9. Recommended priority fixes

| Priority | Issue | Effort |
|----------|-------|--------|
| **P0** | Add error boundaries (blank screen on chunk load failure) | 1 hour |
| **P0** | Fix admin dashboard "Owners" count bug (`head: true`) | 5 min |
| **P0** | Fix search page title when no listing_type is set | 5 min |
| **P1** | Lift favorites to context (eliminate N queries per PropertyCard) | 1 hour |
| **P1** | Fix view counter: skip increment for owner, add basic rate limit | 30 min |
| **P1** | Add focus trap to Modal | 1 hour |
| **P1** | Extract duplicated status tone/label maps to constants | 15 min |
| **P2** | Remove `scroll-behavior: smooth` or use instant scrollTo | 5 min |
| **P2** | Add skip-to-content link | 15 min |
| **P2** | Add dynamic `<title>` to all pages | 30 min |
| **P2** | Add keyboard support to Gallery zoom (Escape, arrows) | 30 min |
| **P2** | Add tests for `aiSearch.ts` and `utils.ts` | 2 hours |
| **P3** | Add `description` length constraint in DB | 5 min |
| **P3** | Add pagination to MyProperties and Chat messages | 2 hours |
| **P3** | Fix FavoritesPage/MyVisitsPage empty state buttons | 5 min |
| **P3** | Remove unused `SavedSearch` type or add TODO comment | 2 min |
| **P3** | Add `robots.txt` and basic `sitemap.xml` | 30 min |

---

## 10. File inventory

```
├── .env.example              — Environment template (safe, no secrets)
├── .gitignore                — Covers node_modules, dist, .env, buildinfo
├── eslint.config.js          — TS + React hooks + refresh rules
├── index.html                — SPA entry point
├── package.json              — React 19, Vite 8, Tailwind 4, Supabase, Zod
├── tsconfig.json             — Strict mode, path aliases
├── vite.config.ts            — React + Tailwind plugins, @ alias
│
├── supabase/migrations/
│   ├── 0001_extensions.sql   — pgcrypto, pg_trgm, citext
│   ├── 0002_schema.sql       — 11 tables, indexes, constraints
│   ├── 0003_functions.sql    — 9 PL/pgSQL functions (admin, owner, public)
│   ├── 0004_triggers.sql     — 8 triggers (updated_at, profile sync, notifications)
│   ├── 0005_policies.sql     — 30+ RLS policies + column revocations
│   └── 0006_storage.sql      — Storage bucket + 4 policies
│
└── src/
    ├── main.tsx              — React root with BrowserRouter + AuthProvider
    ├── App.tsx               — Lazy routes, route guards
    ├── index.css             — Tailwind theme, keyframes, utilities
    ├── types/index.ts        — 15 interfaces, 8 type aliases
    │
    ├── config/config.ts      — Environment variable access
    ├── lib/
    │   ├── supabase.ts       — Client init + requiresBackend guard
    │   ├── properties.ts     — Query builder + pagination
    │   ├── aiSearch.ts       — Natural language → filter parser
    │   ├── constants.ts      — Cities, types, amenities, labels
    │   ├── utils.ts          — Formatting, time, slug, initials
    │   ├── uploadImage.ts    — Client-side compression + storage upload
    │   └── setup.ts          — Backend-configured check
    │
    ├── hooks/
    │   ├── useAuth.ts        — Auth context + hook
    │   └── useFavorites.ts   — Favorites state + toggle
    │
    ├── components/
    │   ├── auth/             — AuthProvider, RequireAuth, RequireOwner, RequireAdmin
    │   ├── layout/           — Header, Footer, MobileNav, RootLayout, ScrollToTop
    │   ├── dashboard/        — DashboardNav
    │   ├── ui/               — Badge, Button, Card, EmptyState, Input, Modal, Select, Skeleton, Textarea
    │   ├── PropertyCard.tsx  — Card + skeleton grid
    │   ├── PropertyImage.tsx — Lazy image with fallback
    │   ├── SetupNotice.tsx   — Backend setup banner
    │   ├── Logo.tsx          — Brand mark
    │   └── PageLoader.tsx    — Suspense fallback
    │
    └── pages/
        ├── HomePage.tsx          — Hero, search, AI box, featured, how-it-works, trust
        ├── SearchPage.tsx        — Filters, results grid, load more, AI mode
        ├── PropertyDetailsPage.tsx — Gallery, owner card, visit/report modals
        ├── FavoritesPage.tsx     — Saved properties grid
        ├── MyVisitsPage.tsx      — Visit request list
        ├── NotificationsPage.tsx — Notification list + mark read
        ├── HelpPage.tsx          — Safety guide
        ├── NotFoundPage.tsx      — 404
        ├── auth/                 — Login, Register, ForgotPassword, ResetPassword, AuthShell
        ├── dashboard/            — OwnerDashboard, MyProperties, AddProperty, EditProperty, Profile, OwnerVisits, PropertyWizard
        ├── inbox/                — InboxPage, ChatThreadPage
        └── admin/                — AdminDashboardPage
```

---

*End of audit.*
