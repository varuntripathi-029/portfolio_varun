// In-browser hybrid search: sentence embeddings (all-MiniLM-L6-v2 via transformers.js) over a
// prebuilt index, blended with a small keyword score. No server is involved.

export type Chunk = {
  id: number
  path: string
  section: string
  title: string
  text: string
  group?: string
  /** slug of the card or heading this chunk came from, so a result can open it */
  target?: string
  vec: number[]
}

export type Hit = {
  chunk: Chunk
  score: number
  semantic: number | null
  matched: string[]
}

type Index = { model: string; dim: number; built: string; chunks: Chunk[] }
type Embedder = (text: string, opts: { pooling: 'mean'; normalize: boolean }) => Promise<{ data: Float32Array }>

let indexPromise: Promise<Index> | null = null
let embedderPromise: Promise<Embedder> | null = null
let ready = false

// Primary work outranks write-ups about it when two chunks are otherwise close.
const PRIOR: Record<string, number> = { Projects: 0.05, Hackathons: 0.02 }

const STOP = new Set(
  'a an and are as at be but by do does for from has have how i in is it me my of on or that the this to was what when where which who why with you your about any best show tell'.split(
    ' ',
  ),
)

export function loadIndex(): Promise<Index> {
  if (!indexPromise) {
    indexPromise = fetch('/search-index.json').then((r) => {
      if (!r.ok) throw new Error('search index missing')
      return r.json() as Promise<Index>
    })
  }
  return indexPromise
}

export function loadModel(onProgress?: (pct: number) => void): Promise<Embedder> {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const index = await loadIndex()
      const { pipeline, env } = await import('@huggingface/transformers')
      env.allowLocalModels = false
      const files = new Map<string, number>()
      const extractor = await pipeline('feature-extraction', index.model, {
        dtype: 'q8',
        progress_callback: (p: { status: string; file?: string; progress?: number }) => {
          if (p.status === 'progress' && p.file && typeof p.progress === 'number') {
            files.set(p.file, p.progress)
            onProgress?.(Math.max(...files.values()))
          }
        },
      })
      ready = true
      return extractor as unknown as Embedder
    })()
    embedderPromise.catch(() => {
      embedderPromise = null
      ready = false
    })
  }
  return embedderPromise
}

export const isModelReady = () => ready

function tokens(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
}

// Rare query words count for more than common ones (a small inverse-document-frequency weight).
function keyword(chunk: Chunk, qTokens: string[], weights: number[]): { score: number; matched: string[] } {
  if (!qTokens.length) return { score: 0, matched: [] }
  const title = chunk.title.toLowerCase()
  const body = chunk.text.toLowerCase()
  const matched: string[] = []
  let hit = 0
  let total = 0
  qTokens.forEach((t, i) => {
    total += weights[i] * 1.6
    if (title.includes(t)) {
      hit += weights[i] * 1.6
      matched.push(t)
    } else if (body.includes(t)) {
      hit += weights[i]
      matched.push(t)
    }
  })
  return { score: hit / total, matched }
}

export async function search(query: string, semantic: boolean): Promise<Hit[]> {
  const q = query.trim()
  if (!q) return []
  const index = await loadIndex()
  const qTokens = tokens(q)
  const weights = qTokens.map((t) => {
    const df = index.chunks.filter((c) => `${c.title} ${c.text}`.toLowerCase().includes(t)).length
    return Math.log(1 + index.chunks.length / Math.max(df, 1))
  })

  let qv: Float32Array | null = null
  if (semantic && ready && embedderPromise) {
    const embed = await embedderPromise
    qv = (await embed(q, { pooling: 'mean', normalize: true })).data
  }

  const hits: Hit[] = index.chunks.map((chunk) => {
    const kw = keyword(chunk, qTokens, weights)
    let sem: number | null = null
    if (qv) {
      let dot = 0
      for (let i = 0; i < qv.length; i++) dot += qv[i] * chunk.vec[i]
      sem = dot
    }
    const prior = PRIOR[chunk.section] ?? 0
    const score = sem === null ? kw.score * 0.5 + prior : sem + kw.score * 0.3 + prior
    return { chunk, score, semantic: sem, matched: kw.matched }
  })

  const floor = qv ? 0.2 : 0.08
  const seen = new Set<string>()
  return hits
    .filter((h) => h.score >= floor)
    .sort((a, b) => b.score - a.score)
    .filter((h) => {
      const key = h.chunk.group ?? `#${h.chunk.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 5)
}
