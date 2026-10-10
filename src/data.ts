export const profile = {
  name: 'Varun Tripathi',
  headline:
    'AI engineer building RAG pipelines, agentic workflows and LLM systems that run in production',
  intro:
    'Final-year B.Tech at IIIT Nagpur (ECE, IoT, 2023–2027). Currently an AI + QA engineer intern at TIFIN AI, working on agentic infrastructure for wealth management.',
  email: 'varun.tripathi2004@gmail.com',
  linkedin: 'https://www.linkedin.com/in/varun-tripathi-bb338a295/',
  github: 'https://github.com/varuntripathi-029',
  resume: '/varun_resume_aiqa.pdf',
  photo: '/varun.jpg',
}

export type Experience = {
  role: string
  org: string
  period: string
  points: string[]
}

export const experience: Experience[] = [
  {
    role: 'AI + QA Engineer Intern',
    org: 'TIFIN AI',
    period: 'Oct 2026 – Present',
    points: [
      'TIFIN is a J.P. Morgan-backed AI platform for wealth management, building an agentic operating system for wealth managers and product providers.',
      'Focus areas: agentic workforce platforms, tax intelligence and financial LLM innovation across the US, Spain and India.',
    ],
  },
  {
    role: 'US Market Operations & Client Success',
    org: 'REVES Media Agency',
    period: 'Remote, Feb 2024 – Mar 2025',
    points: [
      'Managed 300+ US esports clients end-to-end, ran continuous US market research on emerging teams and audience trends, and built a 1,000+ member Twitter/Discord community that fed back into prospecting.',
    ],
  },
]

export const skills: { group: string; items: string }[] = [
  {
    group: 'AI / ML',
    items:
      'RAG pipelines, LLM inference optimization, agentic workflows, LangGraph, CrewAI, FAISS, ChromaDB, pgvector, BAAI/bge, Sentence-Transformers, PyTorch, ConvLSTM, tool calling, SSE streaming, PaddleOCR, LLM evaluation',
  },
  {
    group: 'Backend',
    items:
      'Python, FastAPI, Celery, asyncio, SQLAlchemy 2.0, Pydantic v2, Java 21, Spring Boot, PostgreSQL, Redis, Docker, AWS, WebSockets, JWT, OAuth2',
  },
  {
    group: 'Frontend',
    items: 'React 19, Next.js, TypeScript, Vite, Tailwind CSS, Expo / React Native, Zustand, Recharts',
  },
  { group: 'Tools', items: 'Claude, Cursor, n8n, Notion, Figma, Git, Linux, Bash' },
]

export type Project = {
  slug: string
  title: string
  tagline: string
  summary: string
  tags: string[]
  color: string
  stack: string[]
  facts: string[]
  links: { label: string; href: string }[]
  status?: string
}

export const projects: Project[] = [
  {
    slug: 'hiresignal',
    title: 'HireSignal',
    tagline: 'Hiring momentum from 886+ public sources, scored deterministically',
    summary:
      'Crawls career pages, ATS boards, RSS feeds and news APIs to find job postings and score company hiring momentum. The score is deterministic; no model writes it.',
    tags: ['AI platform', 'In production'],
    color: 'var(--c-indigo)',
    stack: ['FastAPI', 'PostgreSQL / pgvector', 'Celery', 'Groq · Llama-3.1-8B', 'React 19'],
    facts: [
      'Gates an LLM extractor behind a rule pre-filter and a small classifier, cutting inference spend 12x at 0.96 mean confidence',
      '48 endpoints, 319 tests',
    ],
    links: [{ label: 'Live site', href: 'https://get-job-fe.vercel.app/' }],
    status: 'Actively building',
  },
  {
    slug: 'mx-rating',
    title: 'MX_rating',
    tagline: 'A reproducible score for how agent-friendly a website is',
    summary:
      'Scores a website on how well AI agents can crawl, understand and act on it. A rule engine produces a reproducible score; an LLM only narrates the evidence.',
    tags: ['SaaS', 'Agents'],
    color: 'var(--c-emerald)',
    stack: ['FastAPI', 'Playwright', 'PostgreSQL', 'Groq · Llama-3.3-70B', 'Next.js 16'],
    facts: [
      '9-stage workflow, ~13 deterministic checks across 6 dimensions',
      'Citation validation on every LLM statement',
    ],
    links: [{ label: 'Live site', href: 'https://ma-frontend-seven.vercel.app/' }],
  },
  {
    slug: 'legal-contract-analyzer',
    title: 'Legal Contract Analyzer',
    tagline: 'RAG over Indian employment contracts, first token in 0.2s',
    summary:
      'RAG API that analyzes Indian employment contracts against constitutional law, with streamed answers and OCR for scanned documents.',
    tags: ['RAG', 'Backend'],
    color: 'var(--c-vermilion)',
    stack: ['FastAPI', 'FAISS', 'Groq LPUs · SSE', 'Redis', 'PaddleOCR'],
    facts: [
      'TTFT cut ~90x by moving to Groq with SSE streaming',
      'Retrieval 40x faster with local CPU embeddings',
      'Redis ZSET LRU eviction caps sessions at 250 concurrent users',
    ],
    links: [
      { label: 'Frontend', href: 'https://legal-rag-frontend-silk.vercel.app/' },
      { label: 'API docs', href: 'https://babemario-legal-clause-be.hf.space/docs' },
    ],
  },
  {
    slug: 'urbanair-intel',
    title: 'UrbanAir Intel',
    tagline: 'A 1 km air-quality twin of Delhi NCR',
    summary:
      'Fuses 5 live data sources into a gridded forecast, with multi-agent workflows attributing pollution to its sources.',
    tags: ['Forecasting', 'Multi-agent'],
    color: 'var(--c-violet)',
    stack: ['PyTorch ConvLSTM', 'LangGraph', 'Groq', 'pytest'],
    facts: [
      'Trained on 2,163 hourly 11-channel tensors across 2,805 grid cells',
      'Beats the persistence baseline by 7.3%',
      '59 automated test cases',
    ],
    links: [{ label: 'Live site', href: 'https://eta-liard-nine.vercel.app/' }],
  },
]

export const hackathons = [
  {
    event: 'Zoho Catalyst',
    when: 'Jul 2026',
    result: '3rd Runner Up',
    title: 'Crime Intelligence Platform',
    detail:
      '10 FastAPI microservices on real NCRB crime data: forecasting, network analysis, explainable AI (SHAP) and offender profiling. React 19, Leaflet, D3.',
  },
  {
    event: 'Redrob AI',
    when: 'Jun 2026',
    result: 'Finalist',
    title: 'Candidate ranking pipeline',
    detail:
      '4-stage pipeline ranking 100K resumes in under 45 seconds on CPU. Sentence-transformers, ONNX Runtime and FAISS with a 13-feature weighted scorecard and deterministic explanations.',
  },
  {
    event: 'ET AI Hackathon',
    when: 'Jul 2026',
    result: 'Finalist',
    title: 'UrbanAir Intel',
    detail: 'Air-quality forecasting and source attribution with a PyTorch ConvLSTM, LangGraph and Groq.',
  },
  {
    event: 'LatentCode',
    when: 'Aug 2026',
    result: 'Finalist',
    title: 'SynapseScan',
    detail:
      'Tech-debt intelligence platform: RAG over code chunks, tree-sitter AST parsing, CI/CD webhook integration and PostgreSQL. Next.js 14.',
  },
]

export const honors = [
  'LeetCode Knight, rating 1886 with 300+ problems solved',
  '30+ public GitHub repositories',
  '1st place, Maximise (E-Summit 2026): highest ROI on a INR 10,00,000 virtual portfolio',
  '1st rank, Ad Mads (Abhivyakti 2026)',
  'GenAI certification: building and optimizing generative AI with LangChain and HuggingFace (Udemy, Jan 2026)',
]

export type Blog = {
  slug: string
  metric: { value: string; label: string }
  title: string
  tagline: string
  org: string
  summary: string
  color: string
  tags: string[]
  sections: { heading: string; text: string }[]
  links: { label: string; href: string }[]
}

export const blogs: Blog[] = [
  {
    slug: 'upstox-tax-cost-insights',
    metric: { value: '25 rules', label: '158 tests behind the tax engine' },
    title: 'Know what you keep, before you sell',
    tagline: 'Tax if you sold today, and what you actually keep',
    org: 'Upstox',
    summary:
      'A decision layer on top of Upstox’s existing reports: tax if you sold today, what waiting saves, and how much of a gain survives charges. Includes a working demo.',
    color: 'var(--c-indigo)',
    tags: ['Fintech', 'Working demo'],
    sections: [
      {
        heading: 'The gap',
        text: 'Upstox’s Ledger, P&L, Tax and Holdings reports are records of the past, read at ITR time. None answer what an investor asks before acting: what a sale costs in tax today, what waiting would change, how much of the INR 1.25L tax-free limit is going unused, and how much of a gain survives charges.',
      },
      {
        heading: 'What already exists',
        text: 'Benchmarked Upstox, Zerodha and Groww feature by feature, and built on Upstox’s existing tax-loss harvesting rather than duplicating it. Losses hand off to that tool; gain harvesting, days-to-long-term with the rupee value of waiting, keep-after-tax-and-charges, SIP lot clocks and an ELSS unlock tracker are the new layer.',
      },
      {
        heading: 'A decision that shaped it',
        text: 'An intent gate defaults to “just looking”, so the system states tax consequences and never manufactures trading intent. The copy rules are enforced by tests.',
      },
      {
        heading: 'The build',
        text: 'A pure TypeScript tax engine implementing 25 rules, 6 personas that each prove a different rule, serverless routes on Upstox’s public APIs, and 158 tests.',
      },
    ],
    links: [
      { label: 'Live demo', href: 'https://upstox-ass.vercel.app/' },
      { label: 'Code', href: 'https://github.com/varuntripathi-029/upstox_ass' },
    ],
  },
  {
    slug: 'upstox-half-the-users',
    metric: { value: '5.2M → 2.25M', label: 'NSE active clients, revenue up 25%' },
    title: 'Half the users, 25% more revenue',
    tagline: 'Why clients fell while revenue grew, and what to build next',
    org: 'Upstox',
    summary:
      'Why NSE active clients fell from 5.2M to 2.25M while revenue rose 25%, and which segment is worth owning next.',
    color: 'var(--c-emerald)',
    tags: ['Fintech', 'Analysis'],
    sections: [
      {
        heading: 'Diagnosis',
        text: 'Traced a fall from 5.2M to 2.25M NSE active clients (14.5% to 5.6% share) against revenue rising 25% to INR 1,311 Cr. Tested 6 hypotheses and left 2 root causes standing as Groww climbed from 10.7% to 23.4%.',
      },
      {
        heading: 'Market sizing',
        text: 'Anchored the whitespace in SEBI’s derivatives study, where 93% of traders lose a combined INR 1.81 lakh Cr, naming the unsolved trader-to-investor shift as the segment worth owning.',
      },
      {
        heading: 'Proposal',
        text: 'A 9-page spec repositioning the app as a self-directed investor platform, with prioritised requirements, success metrics with 6- and 12-month targets, and a 5-phase launch gated on ship criteria.',
      },
    ],
    links: [{ label: 'Read the study', href: 'https://upstox-vert.vercel.app/' }],
  },
  {
    slug: 'whatsapp-pay',
    metric: { value: '500M → <1%', label: 'users vs UPI transaction share' },
    title: 'WhatsApp Pay: 500M users, under 1% of UPI',
    tagline: 'Why distribution hasn’t turned into payments',
    org: 'WhatsApp',
    summary: 'Why a 500M-user app holds under 1% of UPI transactions in India, and a payments strategy built on Click-to-WhatsApp Ads.',
    color: 'var(--c-vermilion)',
    tags: ['Fintech', 'Analysis'],
    sections: [
      {
        heading: 'The question',
        text: 'WhatsApp has 500M users in India but under 1% of UPI transaction share. The study works out why the distribution advantage has not converted into payments.',
      },
      {
        heading: 'The proposal',
        text: 'A payments strategy built on Click-to-WhatsApp Ads, with a linked write-up covering the approach.',
      },
    ],
    links: [{ label: 'Read the study', href: 'https://whatsapp-summary-neon.vercel.app/' }],
  },
  {
    slug: 'mx-rating-study',
    metric: { value: '6 dimensions', label: 'one deterministic, contestable score' },
    title: 'Scoring the web for AI agents',
    tagline: 'What to measure, what to keep deterministic, what to cut',
    org: 'MX_rating',
    summary:
      'The thinking behind a score for how reliably AI agents can use a website: what to measure, what to keep deterministic, and what to cut.',
    color: 'var(--c-violet)',
    tags: ['AI', 'Systems design'],
    sections: [
      {
        heading: 'A defensible rubric',
        text: 'Hand-weighted 6 dimensions behind a public methodology page and kept the score a deterministic rule output, leaving the model to narrate evidence so any result can be contested line by line.',
      },
      {
        heading: 'A scope cut',
        text: 'Dropped a live agent-simulation feature from v1 on cost, holding the release to a single-URL scan that returns an evidence-linked report inside a minute.',
      },
      {
        heading: 'The companion blog',
        text: 'A narrative deep dive on the product thinking, built with React 19, Vite, Motion and Recharts.',
      },
    ],
    links: [
      { label: 'Product', href: 'https://ma-frontend-seven.vercel.app/' },
      { label: 'Blog', href: 'https://mx-blog-psi.vercel.app/' },
      { label: 'LinkedIn post', href: 'https://lnkd.in/p/ddiziy7n' },
    ],
  },
  {
    slug: 'meesho-valmo',
    metric: { value: '145 bps', label: 'contribution-margin hit, traced' },
    title: 'Mall scales, Valmo predicts',
    tagline: 'Fixing a 145 bps margin hit without rebuilding Mall',
    org: 'Meesho',
    summary:
      'Where a 145 bps contribution-margin hit came from, and a two-layer system for scaling Meesho Mall without rebuilding the core experience.',
    color: 'var(--c-magenta)',
    tags: ['E-commerce', 'Unit economics'],
    sections: [
      {
        heading: 'Capacity shock',
        text: 'Traced a 145 bps contribution-margin compression in FY26 to a single 3PL exit (Ecom Express) that forced emergency capacity scaling on Valmo. Estimated Rs 224–310 Cr in avoidable cost, with a repeat at FY27 scale costing about Rs 780 Cr.',
      },
      {
        heading: 'A corrected model',
        text: 'Falsified the initial ad-valorem take-rate model (t = 0.19) by reconciling revenue to a roughly Rs 59 per order fixed fee, then restructured the contribution equation to CP = f + a·AOV − F − R.',
      },
      {
        heading: 'The system',
        text: 'Two layers: contextual Mall discovery from high-intent search, and a lane-level capacity-intelligence layer on Valmo. It scales existing Meesho Mall (+93% NMV YoY, 1,200+ brands) without rebuilding the core experience.',
      },
      {
        heading: 'How to test it',
        text: 'A user-level A/B test with contribution margin per shipped order as the primary metric, 5 guardrails, and a 4-stage rollout from a 3-city pilot to GA across 50 Tier-2 cities.',
      },
    ],
    links: [{ label: 'Read the study', href: 'https://meesho-virid.vercel.app/' }],
  },
]

export const leadership = [
  {
    role: 'Lead',
    org: 'E-Cell, IIIT Nagpur',
    period: 'Aug 2023 – Apr 2025',
    points: [
      'Closed INR 11,00,000+ across 10+ technology sponsors, from cold outreach to signature.',
      'Directed 20+ volunteers to stage 17 entrepreneurship events with 2,500+ attendees.',
    ],
  },
  {
    role: 'Corporate Co-Lead',
    org: 'Abhivyakti 2026',
    period: '2026',
    points: [
      'Led a team of 8 and closed partnerships with 20+ companies worth INR 20L+ in monetary and in-kind sponsorship.',
    ],
  },
  {
    role: 'Campus Student Leader',
    org: 'Zerodha Under 25',
    period: '2026',
    points: [
      'Ran the campus-artist programme at IIIT Nagpur and booked 4 headline acts for Abhivyakti 2026.',
      'Owned outreach, negotiation and on-ground delivery for a 5,000+ live crowd and 1M+ online impressions.',
    ],
  },
  {
    role: 'Marketing Lead',
    org: 'TantraFiesta Tech Fest',
    period: 'Aug 2024 – Oct 2024',
    points: ['Grew registered participants 16.7% year on year to 1,400+ and drew a 5,000+ crowd.'],
  },
]
