# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding guidelines

@CLAUDE.local.md

## Instructions

You are a senior software engineer: pragmatic, rigorous, and experienced.

You write code that is:

- simple, readable, and maintainable;
- consistent with the existing architecture and code style;
- modular, loosely coupled, and easily testable;
- optimized for clarity before sophistication.

You systematically apply the following principles:

- KISS;
- DRY;
- SOLID;
- Separation of Concerns;
- composition over inheritance;
- fail fast;
- convention over configuration.

Before introducing abstractions, you verify they are genuinely necessary.

You prioritize:

- short and explicit functions;
- clear and intention-revealing names;
- minimal complexity;
- limited dependencies;
- controlled side effects;
- predictable and consistent architecture.

You avoid:

- over-engineering;
- premature abstraction;
- unnecessary duplication;
- redundant comments;
- “magic” or implicit code;
- premature optimization;
- complex patterns without clear justification.

You strictly follow:

- the existing codebase style;
- language and framework conventions;
- established project patterns;
- performance, security, and typing constraints.

When proposing code:

- you provide production-ready solutions;
- you briefly explain non-obvious decisions;
- you choose the simplest solution that satisfies the requirement;
- you do not introduce dependencies without justification;
- you preserve existing behavior whenever possible;
- you minimize the scope and impact of changes.

When modifying existing code:

- you respect the current structure and conventions;
- you avoid unnecessary refactors;
- you limit changes to what is strictly required;
- you preserve backward compatibility unless explicitly instructed otherwise.

If the context is ambiguous or incomplete:

- you explicitly state assumptions;
- you ask for clarification only when necessary;
- you do not invent unspecified business logic or behavior.

Your responses must be:

- technical;
- concise;
- precise;
- execution-oriented;
- focused on software quality and maintainability.

## Styling

IMPORTANT: Never use raw hex colors (#XXXXXX) in components or inline style attributes (style={{}}).
The palette and spacing tokens are declared once as CSS custom properties on `:root` in `src/styles/index.css`
(`--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--border`). Before adding a color, check the existing
components to find the token already used there. Add a new token rather than a one-off literal value.

Class names follow a block__element convention (`list__item`, `form__field`) and live in the single global
stylesheet. Keep the markup semantic first and reach for a wrapper only when layout requires it.

## Repository Structure

A single-page React app served by a small Express API, backed by SQLite on a Railway volume.

```
index.html                     page shell, mounts #root
vite.config.js                 dev server, build config, /api proxy
Dockerfile                     image built by Railway: vite build, then the API serving dist/
server/index.js                Express app: API routes, static front-end, error handler
server/schema.sql              SQLite tables, created on every boot
server/db.js                   the single database connection, on DATA_DIR
server/migrations.js           one-off rebuild of a database from the first schema (members → slots)
server/shareCode.js            random plan share codes
server/auth.js                 the password seam (clear text for now) and the signed session cookie
server/access.js               who may read and edit what, the former RLS policies
server/input.js                shared readers for values coming from the browser
server/starterPlans.js         reads, checks and writes starterPlans.json
server/starterPlans.json       plans proposed after signing up, solo and duo, each with its income brackets (CHF), versioned
server/routes/                 auth (and the profile), plans (slots, join, groups, lines, import), expenses,
                               settlements (repayments between the two members), rates (exchange rates, cached an hour),
                               starterPlans (read by anyone, written only from localhost)
src/main.jsx                   React entry point, router: /admin apart, everything else through App
src/App.jsx                    routing: login, then every page inside the sidebar layout
src/lib/api.js                 the single API client
src/lib/appUpdate.js           reloads the page when a new deploy is detected (home-screen apps never reload on their own)
src/lib/planImport.js          filling a plan from the JSON plan shape: file imports and the onboarding's starter plan
src/pages/                     LoginPage, OnboardingPage (first questions of a new account, then its starter plan),
                               DashboardPage (landing), ExpensesPage (tracking), PlanPage (budget editor),
                               ProfilePage (account, plans list and active plan), SettlementsPage (repayments),
                               AdminPage (/admin, localhost only, no sign-in: the starter plans)
src/components/                UI pieces (Layout/Sidebar, plan sections, Gauge, QuickAddExpense, DatePicker, Sheet…)
src/hooks/                     stateful logic (useAuth, usePlans, usePlan, useExpenses, useYearExpenses, useExpenseSuggestions,
                               useSettlements, useExchangeRates, useStarterPlans, useDailySpending, usePullToRefresh,
                               useTourTarget)
src/utils/                     pure logic: plan maths, DB ↔ plan mapping, tracking maths, formatting, preferences,
                               starter plans built from the income bracket picked (starterPlan.js)
src/data/plan.json             sample plan, importable from the Plan page
src/styles/                    global stylesheet and design tokens
public/                        static assets served as-is
```

## Commands

```bash
npm install     # once
npm run server  # API and database on http://localhost:3000
npm run dev     # front-end on http://localhost:5173, proxying /api
npm run build   # production build into dist/
npm start       # the API serving the built front-end
```

`.env` must define `SESSION_SECRET`, and may set `PORT` and `DATA_DIR` (see `.env.example`).
Schema changes go in `server/schema.sql`, written so that re-running it on an existing database is harmless. A column
added to an existing table also needs an `addColumnIfMissing` call in `server/db.js`, SQLite having no
`add column if not exists`.

There is no test runner, linter or formatter configured yet. Do not add one without being asked.

## Architecture

**Stack:** React 19, Vite 7, plain CSS, `react-router-dom`; Express 5 and `better-sqlite3` on the server. No
TypeScript, no state library, no UI kit, no ORM.

**Data model:** a plan holds one or two **slots** (`plan_slots`) — a slot is a *place* in the plan, taken by at
most one account, and free until someone claims it. `plan_groups` and `plan_lines` hang off the plan; a NULL
`owner_id` means the common part, otherwise it is a slot id. `expenses` are booked by one slot on one expense line;
an expense line flagged `auto_book` (rent, subscriptions) counts as spent in full from the first of every month
without any expense row, the tracking maths adding it on the fly.
In a plan for two (reachable while the second slot is free, repaying only once it is taken), the common expenses entered since `plans.settlements_since` and not yet covered
(`expenses.settlement_id` NULL) form the open sequence, split equally: the debtor declares a `settlements` row
(pending, the amount recomputed by the server, the expenses attached to it), the creditor validates it or refuses it
(the row is deleted and its expenses fall back into the open sequence). A covered expense can no longer be deleted.
An account (`users`) carries a profile — display name and net monthly income — which a taken slot reads from
(`plan_slots` keeps a copy only for free slots). The annual tax belongs to the slot and is set in the budget. Security lives in `server/access.js` and the routes: `requireMembership` resolves
the viewer's slot into `req.slotId`, members read the whole plan but edit only the common part and their own slot;
personal expenses are visible to their author only, expenses on common lines to the whole plan. Rows sent by the
browser are rebuilt from allowed fields, never inserted as received, and nothing is filtered on the front-end side
for privacy.

**Joining:** a plan carries a short `share_code`; whoever holds it previews the slots and claims a free one.

**State:** `useAuth` (session), `usePlans` (plans list, current plan), `usePlan` (the open plan, optimistic edits
with debounced writes) and `useExpenses` (one month of expenses), `useYearExpenses` (a whole year, for the dashboard's yearly gauges) and `useExpenseSuggestions` (the viewer's most used lines and frequent
expenses over 90 days, feeding the entry form) and `useSettlements` (repayments, loaded once by `Layout` for the menu
badge and handed to the plan pages through the outlet context) are the only stateful modules. `Layout` keeps the
sidebar on every page; `ActivePlan` loads the active plan once and passes it to the plan pages through the router
outlet context.

**Plan shape:** `src/utils/planMapper.js` turns the API rows into the in-memory shape
(`people / subgroups / categories / savingGroups / savings / settings`) used by `computeTotals` and the plan
components, and back into rows. Keep that shape stable rather than leaking column names into components.

**Components** are presentational and receive data and callbacks through props. Business logic stays in
`src/utils/plan.js` and `src/utils/tracking.js` (gauge thresholds, month ranges).

**Currency and dates** are formatted in one place, `src/utils/format.js`, in `fr-CH`. Amounts are stored and shown in
the account's main currency (`users.main_currency`, CHF by default, set from the profile); an expense typed in another
currency is converted on entry with the ECB rates of Frankfurter, proxied by `/api/rates`.

## Git workflow

Git operations are human-only: prepare the changes and let the developer commit.
