/**
 * Teacher-area server entry point.
 *
 * Start it on any host that runs Node (a VPS, a container host, a PaaS
 * with a persistent filesystem):
 *
 *   TEACHER_PASSWORD_HASH='scrypt$…' PORT=8787 npm run server
 *
 * The server refuses to start without a valid hash — see
 * docs/TEACHER_AUTH.md for how to generate it and what deployment options
 * exist (GitHub Pages itself cannot run this server; it hosts static
 * files only).
 */
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { isValidHashFormat } from './auth.js'

const SERVER_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SERVER_DIR, '..')

const passwordHash = process.env.TEACHER_PASSWORD_HASH
if (!passwordHash || !isValidHashFormat(passwordHash)) {
  console.error(
    [
      '',
      '✗ TEACHER_PASSWORD_HASH is missing or malformed.',
      '  Generate a hash for the initial teacher password with:',
      '    npm run hash:password',
      '  then store the resulting scrypt$… string as the TEACHER_PASSWORD_HASH',
      '  secret of your deployment and restart the server.',
      '  The server intentionally refuses to start without it — a host that',
      '  cannot verify a login must not serve the teacher area at all.',
      '',
    ].join('\n'),
  )
  process.exit(1)
}

const distDir = process.env.TEACHER_DIST_DIR
  ? resolve(process.env.TEACHER_DIST_DIR)
  : resolve(ROOT, 'dist')
if (!existsSync(distDir)) {
  console.warn(`[teacher-server] warning: ${distDir} not found — run 'npm run build' first (the API still works).`)
}

const dataDir = process.env.TEACHER_DATA_DIR
  ? resolve(process.env.TEACHER_DATA_DIR)
  : resolve(SERVER_DIR, 'data')

const secureCookies = process.env.TEACHER_SECURE_COOKIES === 'true'
const port = Number(process.env.PORT ?? 8787)

const app = createApp({ passwordHash, distDir, dataDir, secureCookies })
const server = createServer(app)

server.listen(port, '0.0.0.0', () => {
  console.log(`[teacher-server] serving on http://0.0.0.0:${port}`)
  console.log(`[teacher-server] static build: ${distDir}`)
  console.log(`[teacher-server] data dir: ${dataDir}`)
  console.log(`[teacher-server] secure cookies: ${secureCookies}`)
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.close(() => process.exit(0))
    // do not hang forever on keep-alive connections: force exit shortly after
    setTimeout(() => process.exit(0), 2000).unref()
  })
}
