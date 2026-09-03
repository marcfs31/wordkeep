import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packaged = join(dirname(fileURLToPath(import.meta.url)), '../data')

export function writableDir(subdir = ''): string {
  const candidates = [
    process.env.WORDKEEP_DATA_DIR,
    packaged,
    '/tmp/wordkeep-data',
  ].filter((item): item is string => Boolean(item))
  for (const root of candidates) {
    const dir = subdir ? join(root, subdir) : root
    try {
      mkdirSync(dir, { recursive: true })
      return dir
    } catch {
      /* read-only, try next */
    }
  }
  return join('/tmp', subdir || 'wordkeep')
}
