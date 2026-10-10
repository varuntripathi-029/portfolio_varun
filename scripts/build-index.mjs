// Builds public/search-index.json: every piece of site content as a chunk with a
// sentence embedding, so the browser only has to embed the visitor's query.
// Run with: npm run index   (re-run whenever src/data.ts changes)
import { writeFileSync } from 'node:fs'
import { pipeline } from '@huggingface/transformers'
import * as data from '../src/data.ts'

const MODEL = 'Xenova/all-MiniLM-L6-v2'

// Plain-language aliases so common ways of asking still land on the right project.
const ALIASES = {
  hiresignal: 'hiring jobs recruiting scraping crawler LLM cost reduction classifier pgvector semantic matching',
  'devagent-remote': 'mobile app phone app React Native Expo developer tools remote coding AI agents websocket',
  'mx-rating': 'AI agents website audit SEO scoring deterministic rule engine evaluation LLM',
  'legal-contract-analyzer': 'RAG retrieval augmented generation low latency fast inference time to first token TTFT streaming SSE OCR legal documents vector search',
  'urbanair-intel': 'air quality pollution forecasting deep learning time series PyTorch spatial grid multi-agent',
}

const chunks = []
const add = (path, section, title, text, extra = {}) =>
  chunks.push({ id: chunks.length, path, section, title, text: text.replace(/\s+/g, ' ').trim(), ...extra })

add('/', 'Experience', 'About Varun', `${data.profile.headline}. ${data.profile.intro}`)

for (const e of data.experience) {
  add('/', 'Experience', `${e.role}, ${e.org}`, `${e.role} at ${e.org}, ${e.period}. ${e.points.join(' ')}`)
}
for (const s of data.skills) {
  add('/', 'Experience', `Skills: ${s.group}`, `${s.group} skills and tools: ${s.items}`)
}

for (const p of data.projects) {
  const alias = ALIASES[p.slug] ?? ''
  add('/projects', 'Projects', p.title, `${p.title}. ${p.tagline}. ${p.summary}`, { group: p.title })
  add('/projects', 'Projects', p.title, `${p.title}. ${p.facts.join('. ')}. Stack: ${p.stack.join(', ')}. ${alias}`, { group: p.title })
}

for (const h of data.hackathons) {
  add('/hackathons', 'Hackathons', `${h.title} (${h.event})`, `${h.result} at ${h.event}, ${h.when}. ${h.title}. ${h.detail}`)
}
add('/hackathons', 'Hackathons', 'Honors', data.honors.join('. '))

for (const b of data.blogs) {
  const path = `/blogs/${b.slug}`
  add(path, 'Blogs', b.title, `${b.org}: ${b.title}. ${b.summary}`, { group: b.title })
  for (const s of b.sections) {
    add(path, 'Blogs', `${b.title}: ${s.heading}`, `${b.org}. ${s.heading}. ${s.text}`, { group: b.title })
  }
}

for (const l of data.leadership) {
  add('/leadership', 'Leadership', `${l.role}, ${l.org}`, `${l.role} at ${l.org}, ${l.period}. ${l.points.join(' ')}`)
}

console.log(`Embedding ${chunks.length} chunks with ${MODEL}...`)
const embed = await pipeline('feature-extraction', MODEL, { dtype: 'q8' })

for (const c of chunks) {
  const out = await embed(`${c.title}. ${c.text}`, { pooling: 'mean', normalize: true })
  c.vec = Array.from(out.data, (v) => Math.round(v * 1000) / 1000)
}

const index = { model: MODEL, dim: chunks[0].vec.length, built: new Date().toISOString().slice(0, 10), chunks }
writeFileSync(new URL('../public/search-index.json', import.meta.url), JSON.stringify(index))
console.log(`Wrote public/search-index.json (${chunks.length} chunks, ${index.dim} dims)`)
