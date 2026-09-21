# Spending Planner

A React app to plan a household budget together and track each person's daily expenses against it.

- **Plan**: shared budget with a common part and one part per member. Everyone sees the whole plan and edits the
  common part and their own.
- **Dépenses**: quick entry of expenses in the plan categories, monthly gauges turning amber from 80 % of the
  budget and red once it is exceeded. Personal expenses stay private; expenses on common lines are shared.

## Stack

- React 19, Vite 7, plain CSS
- React Router
- Node, Express and SQLite, the database file living on a Railway volume

## Setup

1. Copy `.env.example` to `.env` and set `SESSION_SECRET` to a long random string
   (`node -e "console.log(crypto.randomBytes(32).toString('hex'))"`).
2. `npm install`.
3. Run the API in one terminal and Vite in another; Vite proxies `/api` to the API.

## Commands

```bash
npm install     # once
npm run server  # API and database on http://localhost:3000
npm run dev     # front-end on http://localhost:5173
npm run build   # production build into dist/
npm start       # the API serving the built front-end
```

`DATA_DIR` holds the SQLite file (`./data` locally, the volume mount on Railway). The tables are created on
the first boot.

## Deployment on Railway

1. The repository is deployed as one service, built from the `Dockerfile`.
2. Attach a volume to that service, mount path `/data`.
3. Set the variables: `NODE_ENV`, `PORT`, `DATA_DIR=/data` and `SESSION_SECRET`.
4. Generate a domain in **Settings → Networking**.

Back up the data by downloading `/data/spending-planner.db`, or by exporting the plan as JSON from the app.

## First use

1. Each person creates an account.
2. One person creates a plan and adds the other by the email of their account.
3. The plan creator can import a JSON plan (`src/data/plan.json`, an exported file, or the plan saved in the
   browser by the previous single-user version) from the **Données** card of the Plan page.
