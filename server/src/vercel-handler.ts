import { app } from './app.ts'
import { seedGraphDemo } from './seed-graph.ts'

if (process.env.WORDKEEP_SEED === '1') {
  try {
    seedGraphDemo()
  } catch (error) {
    console.error('Graph seed skipped', error)
  }
}

async function fetch(request: Request): Promise<Response> {
  return app.fetch(request)
}

export { fetch }
export const GET = fetch
export const POST = fetch
export const PUT = fetch
export const PATCH = fetch
export const DELETE = fetch
export const OPTIONS = fetch
export default { fetch }
