# Spending Planner

A small React app to plan monthly spending together.

## Stack

- React 19
- Vite 7 (dev server and build)
- Plain CSS

## Commands

```bash
npm install     # once
npm run dev     # dev server on http://localhost:5173
npm run build   # production build into dist/
npm run preview # serve the production build
```

## Layout

```
index.html            page shell, mounts #root
vite.config.js        dev server and build config
src/main.jsx          React entry point
src/App.jsx           page composition
src/components/       UI pieces (Header, Summary, ExpenseForm, ExpenseList)
src/hooks/            stateful logic (useExpenses)
src/data/             static lists (categories, people)
src/utils/            helpers (currency formatting)
src/styles/           global stylesheet
public/               static assets served as-is
```

## Notes

State lives in memory only, so a refresh clears the list. `src/hooks/useExpenses.js`
is the single place to swap in persistence later.
