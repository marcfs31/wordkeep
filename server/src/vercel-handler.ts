import { handle } from 'hono/vercel'
import { app } from './app.ts'
import { seedGraphDemo } from './seed-graph.ts'

if (process.env.WORDKEEP_SEED === '1') {
  try {
    seedGraphDemo()
  } catch (error) {
    console.error('Graph seed skipped', error)
  }
}

export default handle(app)
