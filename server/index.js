import express from 'express'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { attachUser } from './auth.js'
import authRouter from './routes/auth.js'
import plansRouter from './routes/plans.js'

const PORT = process.env.PORT ?? 3000
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const index = join(root, 'dist', 'index.html')
const app = express()

// Railway terminates TLS in front of the app
app.set('trust proxy', 1)
app.use(express.json({ limit: '1mb' }))
app.use(attachUser)
app.use('/api/auth', authRouter)
app.use('/api/plans', plansRouter)

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Route inconnue.' })
})

// The built front-end, every other path falling back to its entry so the router can take over
app.use(express.static(join(root, 'dist')))
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    next()
    return
  }

  res.sendFile(index)
})

// A refusal carries its own message, anything else stays in the logs
app.use((error, _req, res, _next) => {
  if (!!error.status) {
    res.status(error.status).json({ error: error.message })
    return
  }

  console.error(error)
  res.status(500).json({ error: 'Erreur inattendue du serveur.' })
})

app.listen(PORT, () => {
  console.log(`Spending Planner listening on port ${PORT}`)
})
