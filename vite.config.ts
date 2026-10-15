import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// In development there is no Vercel, so /api/pulse is served here from the same file the
// deployed function uses. The values come from .env.local, which is never committed.
function localApi(): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''))
      server.middlewares.use('/api/pulse', async (req, res) => {
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const body = Buffer.concat(chunks)
        const mod = await server.ssrLoadModule('/api/pulse.ts')
        const request = new Request('http://localhost/api/pulse', {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: req.method === 'POST' ? body : undefined,
        })
        const out: Response = req.method === 'POST' ? await mod.POST(request) : await mod.GET()
        res.statusCode = out.status
        out.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await out.arrayBuffer()))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localApi()],
})
