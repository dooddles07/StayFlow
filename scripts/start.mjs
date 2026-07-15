import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import handler from '../dist/server/server.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const clientDir = join(__dirname, '..', 'dist', 'client')

const port = Number(process.env.PORT) || 3000
const host = '0.0.0.0'

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0])
  const resolved = normalize(join(clientDir, urlPath))

  if (!resolved.startsWith(clientDir)) return false
  if (!existsSync(resolved) || !statSync(resolved).isFile()) return false

  const ext = extname(resolved)
  const isHashedAsset = resolved.startsWith(join(clientDir, 'assets'))
  res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream')
  res.setHeader('Cache-Control', isHashedAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=3600')
  createReadStream(resolved).pipe(res)
  return true
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (serveStatic(req, res)) return
    }

    const url = `http://${req.headers.host ?? `${host}:${port}`}${req.url}`
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'

    const request = new Request(url, {
      method: req.method,
      headers: new Headers(Object.entries(req.headers).filter(([, v]) => v !== undefined)),
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? 'half' : undefined,
    })

    const response = await handler.fetch(request)

    res.statusCode = response.status
    res.statusMessage = response.statusText
    for (const [key, value] of response.headers) res.setHeader(key, value)

    if (response.body) {
      Readable.fromWeb(response.body).pipe(res)
    } else {
      res.end()
    }
  } catch (err) {
    console.error('Request handling failed:', err)
    if (!res.headersSent) res.statusCode = 500
    res.end('Internal Server Error')
  }
})

server.listen(port, host, () => {
  console.log(`StayFlow listening on http://${host}:${port}`)
})
