import { handle } from 'hono/vercel'
import { app } from '../server/src/app'
import { seedGraphDemo } from '../server/src/seed-graph'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

if (process.env.WORDKEEP_SEED === '1') {
  try {
    seedGraphDemo()
  } catch (error) {
    console.error('Graph seed skipped', error)
  }
}

export default handle(app)
