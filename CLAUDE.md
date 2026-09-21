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
server/auth.js                 password hashing and the signed session cookie
server/access.js               who may read and edit what, the former RLS policies
server/routes/                 auth, plans (and their groups, lines, import), expenses
src/main.jsx                   React entry point, router
src/App.jsx                    routing: login → plan choice → app
src/lib/api.js                 the single API client
src/pages/                     LoginPage, PlanPicker, PlanPage (budget editor), ExpensesPage (tracking)
src/components/                UI pieces (Layout/Sidebar, plan sections, Gauge, QuickAddExpense, ExpenseHistory…)
src/hooks/                     stateful logic (useAuth, usePlans, usePlan, useExpenses)
src/utils/                     pure logic: plan maths, DB ↔ plan mapping, tracking maths, formatting, preferences
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
Schema changes go in `server/schema.sql`, written so that re-running it on an existing database is harmless.

There is no test runner, linter or formatter configured yet. Do not add one without being asked.

## Architecture

**Stack:** React 19, Vite 7, plain CSS, `react-router-dom`; Express 5 and `better-sqlite3` on the server. No
TypeScript, no state library, no UI kit, no ORM.

**Data model:** a plan has members (`plan_members`), sub-groups (`plan_groups`) and lines (`plan_lines`); a NULL
`owner_id` means the common part. `expenses` are booked by one member on one expense line. Security lives in
`server/access.js` and the routes: members read the whole plan, edit only the common part and their own; personal
expenses are visible to their author only, expenses on common lines to every member. Rows sent by the browser are
rebuilt from allowed fields, never inserted as received, and nothing is filtered on the front-end side for privacy.

**State:** `useAuth` (session), `usePlans` (plans list, current plan), `usePlan` (the open plan, optimistic edits
with debounced writes) and `useExpenses` (one month of expenses) are the only stateful modules. `Layout` loads the
plan once and passes it to the pages through the router outlet context.

**Plan shape:** `src/utils/planMapper.js` turns the API rows into the in-memory shape
(`people / subgroups / categories / savingGroups / savings / settings`) used by `computeTotals` and the plan
components, and back into rows. Keep that shape stable rather than leaking column names into components.

**Components** are presentational and receive data and callbacks through props. Business logic stays in
`src/utils/plan.js` and `src/utils/tracking.js` (gauge thresholds, month ranges).

**Currency and dates** are formatted in one place, `src/utils/format.js`, currently `fr-CH` / CHF.

## Git workflow

Git operations are human-only: prepare the changes and let the developer commit.
