import React, { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App.jsx'
import { watchForUpdates } from './lib/appUpdate.js'
import './styles/index.css'

// The local administration, outside the sign-in and loaded only when opened
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))

watchForUpdates()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/admin"
          element={
            <Suspense fallback={<p className="splash">Chargement…</p>}>
              <AdminPage />
            </Suspense>
          }
        />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
