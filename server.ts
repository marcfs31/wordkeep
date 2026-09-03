import { Hono } from 'hono'
import { app } from './server/src/app.ts'
import { seedGraphDemo } from './server/src/seed-graph.ts'

if (process.env.WORDKEEP_SEED === '1') {
  try {
    seedGraphDemo()
  } catch (error) {
    console.error('Graph seed skipped', error)
  }
}

export default app
void Hono
