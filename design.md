# Design notes for varun-portfolio

Read this before changing anything. It records why the site looks and behaves the way it does, so a change can extend the system instead of fighting it.

## 1. What this site is

A personal portfolio for Varun Tripathi, positioned as an **AI/ML engineer**. It must never read as a product-manager portfolio. The blog write-ups are framed as "other work", not as a PM identity.

- Content source of truth: `D:\proj\portfolios\about\about_product.md` (mirrored into `src/data.ts`). Tech detail lives in `about_tech.md`.
- Stack: Vite, React 19, TypeScript, React Router 7, plain CSS (no Tailwind, no UI kit).
- Deploy target: Vercel. `vercel.json` rewrites everything except the resume PDF and `/assets` to `index.html`.
- Repo: `github.com/varuntripathi-029/portfolio_varun`, branch `main`.

### Content rules

- Position as AI/ML engineer. Do not add product-manager wording (PRD, north star, roadmap, "product case study") anywhere visible.
- No phone number on the site. Email, LinkedIn, GitHub and resume only.
- Hide the "details to be updated" placeholder for TIFIN until real content exists.
- Leadership is always the last section and is framed as college work.
- Section order is fixed by the user: Experience, Projects, Hackathons, Blogs, Leadership.
- Blogs keep only fintech studies plus MX_rating and Meesho. Spotify and Zomato were deliberately removed.

## 2. Reference and intent

Layout and interaction feel are modelled on `dhananjaychopra.in`: a rounded left sidebar with pill navigation, large outlined cards, and flat muted colored tiles with a device mockup bleeding off the right edge. We copy structure, rhythm and interaction ideas, never text or assets. Differences on purpose: dark theme, horizontal section pager, expandable cards, and screenshots of real deployed projects.

## 3. File map

| File | Role |
|---|---|
| `src/data.ts` | All content: profile, experience, skills, projects, hackathons, honors, blogs, leadership |
| `src/palette.ts` | Accent variables for cards and a hue list for chips |
| `src/App.tsx` | Shell, sidebar, theme toggle, reveal observer, pointer glow, routes |
| `src/Pager.tsx` | Horizontal section pager (the scroll behavior) |
| `src/Masonry.tsx` | Packs groups of expandable cards into the shortest slots so no blank space is left when cards open |
| `src/Search.tsx`, `src/searchEngine.ts` | In-browser semantic search overlay and its engine |
| `scripts/build-index.mjs` | Builds `public/search-index.json` (content chunks + embeddings) |
| `src/Terminal.tsx`, `src/quant.ts` | The Paper Hands quant terminal (UI) and its backtest engine |
| `scripts/fetch-nifty.mjs` | Downloads the Nifty 50 index-fund NAV history to `public/data/nifty50.json` |
| `src/components.tsx` | `Collapse`, `Timeline`, `ExpandCard`, `ExpandBanner`, `Shot`, `Reel`, `Words`, `PageHead` |
| `src/pages/*.tsx` | One component per section, plus `BlogPost` (the only separate route) |
| `src/styles.css` | Every style. Tokens at the top, later blocks override earlier ones |
| `public/shots/*.jpg` | Real screenshots used inside project and blog tiles |
| `public/varun.jpg` | Portrait, 480x600, 4:5, cropped around the face |
| `public/favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` | The robot mascot, background cut out of the source art. The touch icon sits on a light backdrop because iOS paints transparency black |

## 4. Layout system

### Shell
`.shell` is a two-column grid: a fixed 158px sidebar and `.main`. On pager routes the shell is exactly one viewport tall (`.shell--pager`) and does not scroll. The blog post route (`/blogs/:slug`) is the only normal scrolling page.

### Sidebar
Rounded 28px panel, sticky, full height. Top group is section navigation; second group is outbound links (LinkedIn, GitHub, Resume, Copy email); the theme switch sits at the bottom. Each nav item has its own accent color that appears as a dot on hover and when active.

### One screen per section
This is the most important layout rule. Each section is one screen, because a scroll gesture moves to the next section (see section 5). Therefore:

- A section's default (collapsed) state must fit in the viewport. Sections are checked at roughly 870 to 950px viewport height.
- Tile heights come from the viewport: `--tile-h: clamp(210px, calc((100vh - 370px) / 2 - 56px), 320px)` for two rows, a similar formula for `.tiles-3`. If a new section or extra row is added, recompute so it still fits.
- Inside `.pager-panel` the gutter is overridden to 24px (`--gutter: 24px`) to buy vertical room.
- A section taller than the screen falls back to inner scrolling (see pager rules). That is a safety net, not a design goal.

### Grids

| Class | Where | Behavior |
|---|---|---|
| `.exp-grid` | Experience | Two columns `1.12fr / 1fr`. Row 1: hero card and a side stack (Now banner, Find me, Paper Hands). Row 2: Experience card and a right column with the toolbox card and the tech reel. Plain CSS grid; Experience is deliberately not masonry |
| `Masonry` (`.mason`) | Projects, Blogs, Hackathons | Absolutely positioned cards packed into the shortest available slot on a 6-unit grid, so opening cards never leaves a blank band or pushes a whole row down |

### Masonry (Projects, Blogs, Hackathons)

- **Tile layout is automatic.** `<Masonry>` with no `spans` derives the standard layout from the child count via `tileLayout(n)`: blocks of five (three narrow tiles over two wide ones), and a partial block is completed (1 card spans the row, 2 are wide, 3 are narrow, 4 are two rows of two). Projects, Blogs and Hackathons all use it, so they share one tile size (`--tile-h: 310px`, one-third and one-half widths). **To add a card, add a child; do not edit spans.** Pass `spans` only for a deliberately custom grid.
- `alt` lets an item fall back to a narrower span when that packs without a hole (the wide tiles 4 and 5 become a third each and slot under tiles 2 and 3 when tile 1 is open).
- Placement: for every aligned slot at every allowed width, take the leftmost one whose top is within 48 px of the highest, preferring the wider width. The 48 px tolerance keeps the designed order while collapsed and only reshuffles when a card genuinely grows.
- Every frame a card's height changes (a `ResizeObserver` per card), positions are recomputed from live heights, so neighbours follow the expanding card smoothly and return one by one as cards collapse. A change of column glides over `--expand-dur`; a change of width transitions the same way.
- Collapsed tiles share a height (`--tile-h: 310px` on `.pager-panel .mason`) so rows line up; the open state may grow past it.
- Below 1000 px everything stacks in one column.
- To use it for a new section: render the cards as direct children of `<Masonry spans={...}>` and style narrow/wide variants through `.mason-item[data-span='2'|'3']`, not `:nth-child`. `useSmoothLayout` ignores cards inside `.mason`, because Masonry positions them itself.



## 5. The pager (horizontal scrolling)

Sections sit side by side in a horizontal flex track (`.pager`). Pages turn **right to left** by a sideways gesture, and vertical scrolling only ever moves inside a section. This is deliberate: it is not vertical page scroll, and a vertical scroll never changes the page.

- **URL is the single source of truth.** `/`, `/projects`, `/hackathons`, `/blogs`, `/leadership` each map to a section. Any path change animates the track. Gestures, keys, dots and sidebar all just change the path (`navigate(path, { replace: true })` for gestures).
- **Animation:** custom `requestAnimationFrame` tween, 720ms, ease-in-out cubic, plus a 500ms hold (`COOLDOWN`) so a second swipe cannot chain into another section. Native `scroll-behavior: smooth` is not used because its duration cannot be controlled. Scroll snap is switched off during the tween and restored after.
- **Trackpad:** a sideways two-finger swipe turns the page once it has travelled `SIDE_PUSH` (70 px). A gesture is a run of wheel events with gaps under 160ms; its axis is decided once at the start (so a slightly diagonal swipe does not switch mid-way) and it moves one page at most, so momentum cannot skip sections.
- **Mouse:** press and drag sideways. The page follows the pointer, then settles on the nearest section: it turns if pulled past 14% of the width (`DRAG_SHARE`), or thrown (`DRAG_FLING`, 0.6 px/ms, after at least 60 px). A drag never counts as a click on the card underneath, and text is not selected while dragging.
- **Touch:** horizontal swipes pan the track natively and snap, URL synced when it settles. A vertical swipe of at least 90 px at the end of a section still moves on (phones).
- **Other inputs:** arrow left/right, arrow down/up, Page Down/Up and Space (the last three only when the section fits); the bottom dots; the sidebar.
- **Arriving** at a section always lands at its top.
- **Elastic ends:** there is no custom effect. On a desktop each section is part of the page, so the window scrolls it and the browser's own rubber-band applies at the top and bottom, exactly as on the admin page and the blog write-ups. (Chrome only bounces the page itself, never a scrolling box inside it, which is why the sections do not scroll inside their own box on a desktop.) The track takes the height of the section on show; the section leaving is pinned in place while the page returns to the top.
- **First load:** a deep link such as `/blogs` positions the track instantly with no slide.
- **Phones use the same pager.** Below 760 px the sidebar becomes a one-row top bar, the section fills the rest of the screen (`100dvh`), and the outbound links live in the Find me card.

## 5b. Scroll consistency (read before touching the pager)

- **Blog write-ups** (`/blogs/:slug`) are the one normal scrolling page; they arrive from the right with the same easing.
- Do not special-case a section to scroll differently. If a section feels long, it scrolls inside itself; only a sideways gesture, a drag, keys, dots or the sidebar change the page.

## 6. Color theory

### Principle
Real, pigment-like colors, not a tech gradient. The blue-black and indigo-to-violet look is the default of generated interfaces, so it is avoided on purpose: no violet or purple anywhere, no gradient washes, flat fills only. Accents are earth pigments (denim, moss, terracotta, ochre, oxblood, petrol) on neutrals that lean warm.

### Accent palette (CSS variables, light / dark)

| Token | Light | Dark | Reads as | Used for |
|---|---|---|---|---|
| `--c-blue` | `#3d5a80` | `#34506f` | Denim | Primary: Now banner, first tiles, hero details |
| `--c-emerald` | `#2f7a52` | `#3a6a49` | Moss / forest | Second tile color |
| `--c-vermilion` | `#a85444` | `#98483a` | Terracotta / brick | Warm counter-accent, the "podium" hackathon |
| `--c-ochre` | `#8f6618` | `#86641f` | Ochre / mustard | Fourth tile color |
| `--c-burgundy` | `#8a3a4c` | `#7a3243` | Oxblood | Rare accent |
| `--c-teal` | `#2b6f78` | `#2b6266` | Petrol | Cool counter-accent |

Rules: tile fills keep white text at about 4.5:1 or better. Dark variants are slightly lower in chroma so a saturated fill sits on a dark surface instead of glowing off it. No black overlay on dark tiles (it made them muddy); a 1px inner hairline defines the edge. Never reintroduce hues between 260 and 330 degrees.

### Neutrals
- Light: `--bg #fff`, `--panel #f7f7f6`, `--line #e6e5df`, `--ink #16150f`. Slightly warm, matching the reference.
- Dark: warm graphite, not blue-black: `--bg #141311`, `--panel #1b1a17`, `--raised #24221e`, `--line #302e29`, `--ink #ece9e1`. The warm bias keeps the earth accents harmonious (same temperature family) and avoids the cold-neon feel.
- The theme is set before first paint by an inline script in `index.html` (saved choice, else system preference).

### Chips and pills (reel, skills)
Defined in OKLCH so lightness is equal and only hue changes, which keeps a row of many chips harmonious instead of rainbow:

- Light: background `oklch(94% 0.035 h)`, text `oklch(40% 0.12 h)`, border `oklch(85% 0.06 h)`.
- Dark: background `oklch(31% 0.055 h)`, text `oklch(87% 0.07 h)`, border `oklch(43% 0.08 h)`.
- Hover fills solid at `oklch(50% 0.14 h)` (light) or `oklch(62% 0.13 h)` (dark).
- Hues come from `palette.ts`: earth pigments only (denim 245, moss 160, terracotta 40, ochre 85, petrol 195, brick 15, olive 130). Chroma is kept low (0.035 to 0.14) so nothing looks neon.

### Tints
Expandable white cards tint toward their accent on hover and when open: 8% in light, 12% in dark, with a border at 45% accent. Badges and skill chips use 14% to 24% accent tints.

## 7. Typography

Each family has one job. Do not use a family outside its role.

| Role | Family | Used for |
|---|---|---|
| Titles that grab | **Bricolage Grotesque** 600 to 800 (variable: opsz, wdth) | Tile titles, card titles, timeline titles, blog chapter headings and post title, big numbers. Condensed to wdth 86 in narrow tiles, 92 to 94 elsewhere |
| Page titles and voice | **Fraunces** (variable: opsz, wght, SOFT 100, WONK 1, with italics) | Hero headline, page titles, and the italic one-line teaser under every title |
| Reading | **Fraunces** roman (SOFT 50, WONK 0) | Summaries, expanded card bodies, timeline lines, blog prose, page intros |
| Small UI | **Inter** 400 to 600 | Nav, buttons, forms, small notes |
| Facts | **JetBrains Mono** 400 and 500 | Tile chips, dates, kickers, badges, stack lists, skill and reel chips, chapter numbers |
| Voice | **Caveat** 500 and 600 | The greeting and the small scribble beside the portrait, and the one `.aside` line. One or two uses per page at most |

- **Hierarchy by contrast, not size.** A title is a bold grotesque, its teaser is an italic serif, the body is an upright serif and the facts are mono. Four clearly different textures make the order of reading obvious without making anything bigger.
- **Why this pairing:** Bricolage has an ink-trap quirkiness that suits the earth palette; Fraunces is warm and bookish; together they read as editorial, not as another sans-serif template. Inter is kept small and functional.
- **Reading comfort:** prose is 17 to 18px at line-height 1.62 to 1.68, under about 68ch, with `text-wrap: pretty`; headings use `text-wrap: balance`. Numbers in prose stay lining (not old-style) so they scan as numbers.
- **Chapters:** blog sections are numbered with a mono counter (`01`, `02`...) above a Bricolage heading, and the first paragraph has a drop cap. The counter is CSS only.
- Uppercase appears only on tile chips (mono, tracked). Do not add more uppercase labels.
- Bricolage is no longer limited to the hackathon organiser name, but keep it to titles and numbers; never set paragraphs in it.

### Copy voice
Direct and a little dry. Numbers stay exact, the jokes sit in the framing, never in the facts. Examples already in the site: "886+ sources, one deterministic score, zero vibes", "Your laptop does the coding. Your phone holds the leash." Keep claims true: do not invent results, and never turn a figure into a rounder one for the sake of a line.

## 8. Cards

### Tile (`ExpandBanner`)
Flat muted fill, 28px radius, padding 28 by 32. Anatomy: chips (uppercase, dark translucent fill), title, one-line teaser, circular plus toggle bottom-left, and an **art slot** on the right that bleeds off the right edge.

- Collapsed: title + teaser only. Everything else lives behind the toggle.
- Expanded: summary, a two-column panel (stack / results) and action buttons. The art fades away and the head's min-height collapses.
- Art slot contents come from `Shot`: a browser-window frame holding either a real screenshot (`shot` in data) or a designed placeholder: a stack list, a headline metric with bars (blogs), or a node flow (`diagram`).

### Expandable white card (`ExpandCard`)
Outlined, 28px radius. Header shows kicker, title and a badge; body is hidden until opened. Used for hackathons, honors and skills.

### Timeline (`Timeline`)
Dotted spine, accent-colored dots, one item open at a time. Used for experience and leadership.

### Expand animation
`Collapse` uses `grid-template-rows: 0fr` to `1fr` plus opacity (0.6s). Closed content is `inert`, so it is not focusable. This avoids measuring heights in JS.

### Screenshots
Captured through Claude in Chrome from the deployed sites, resized to 1100px wide JPEG at quality 84, stored in `public/shots/`. Use a placeholder when a site is offline, mid-animation, or shows wording that conflicts with the content rules.

## 9. Motion

| Thing | Spec |
|---|---|
| Easing | `--ease: cubic-bezier(0.22, 1, 0.36, 1)` for movement, `--ease-soft: cubic-bezier(0.4, 0, 0.2, 1)` for color |
| Section glide | 780ms ease-in-out cubic (JS) |
| Card expand | 0.6s |
| Theme change | 0.5s cross-fade on background, color, border |
| Hover | 0.35 to 0.5s; nav pills nudge right 3px with an accent dot; tiles lift 5px and scale 1.01; art shifts up-left 6 to 8px |
| Scroll reveal | Elements fade/settle in (translateY 16px, scale 0.985, 0.7s), staggered 80ms by reading order |
| Headline | Words blur-in one by one (opacity 0 to 1, blur 10px to 0, 55ms stagger) |
| Pointer glow | A radial highlight follows the cursor on cards and tiles |
| Route changes | View Transitions API (0.32s) only for the blog post links |

`prefers-reduced-motion` disables all transitions and animations, and forces revealed content visible.

## 9b. Semantic search

A spotlight-style overlay (sidebar button, `/` or Cmd/Ctrl+K) that searches the site's own content by meaning, entirely in the browser.

- **Model:** `Xenova/all-MiniLM-L6-v2`, 8-bit quantized (about 25 MB), loaded lazily through transformers.js the first time the overlay opens, then cached by the browser. The ONNX wasm runtime is self-hosted from the build output. The main bundle is unaffected because the library is a dynamic import.
- **Index:** `public/search-index.json` holds about 47 content chunks with precomputed 384-dim vectors, so only the visitor's query is embedded at runtime. **Re-run `npm run index` whenever `src/data.ts` changes**, or the search will return stale content.
- **Ranking:** cosine similarity plus a keyword layer weighted by rarity (a small IDF), plus a small prior for projects and hackathons over write-ups. Projects are split into a summary chunk and a facts/stack chunk, and results are de-duplicated per project or blog so one item appears once.
- **Aliases:** plain-language synonyms per project live in `ALIASES` in `build-index.mjs` ("mobile app", "low latency", ...). Add one there when a natural query misses.
- **Fallbacks:** keyword-only matching shows instantly while the model downloads, and stays if the model cannot load.
- **Transparency:** each hit shows its similarity score and the matched words, and the panel states that everything runs locally.
- **File name caveat:** `search.ts` and `Search.tsx` collide on case-insensitive filesystems, so the engine is `searchEngine.ts`.

## 9b2. Hackathons

Colored tiles like Projects and Blogs, packed by `Masonry` with the standard tile layout (four hackathons plus the Honors tile make the usual five).

- Each tile is `ExpandBanner` with a colored fill (podium in terracotta, then blue, teal, ochre), a solid white result chip, the organiser's one-liner, and a small **organiser badge** (`OrgBadge` in `Hackathons.tsx`): the organiser's logo, name and event. There are deliberately **no stat tags or summary strips** here; they were removed on request, so do not reintroduce numbers on these tiles.
- Organiser logos live in `public/logos/` and are used only to identify the event: Zoho Catalyst and Economic Times (from their site icons), Redrob AI, and LatentCode (its own `favicon.svg`). They are trademarks of their owners.
- A new hackathon needs `org`, `logo` and `line` in `src/data.ts` next to the existing fields. Colors cycle through four fills.
- **Type:** Bricolage Grotesque (`--font-poster`) is used only for the organiser name here. Do not spread it to other sections.

## 9c. Paper Hands (the quant terminal)

An optional "game" reached from a collapsed card named **Paper Hands** (kicker "or play") under "Find me" on the Experience section. The card expands to a short overview and an "Enter the arena" button, which dispatches a `open-lab` window event; `App.tsx` listens and mounts `Terminal.tsx` as a full-screen overlay.

- **Premise:** "Can your trading rule beat buy-and-hold after charges and tax?" The card copy is playful; the terminal itself is deliberately serious.
- **Data:** real daily NAVs of an index fund tracking the Nifty 50, 2013 to 2026, from AMFI via mfapi.in. It is pulled once by `npm run data` into `public/data/nifty50.json` (about 70 KB). No API, key or network call is made at runtime. Re-run the script to refresh it.
- **Engine (`src/quant.ts`):** pure functions, long-only all-in/all-out. A signal decided at one close is filled at the **next** close (no look-ahead), and a rule never opens a position on the last day. Rules: SMA crossover and momentum. Costs: Rs 20 plus 0.13% per trade, modelled as an index ETF; cash earns nothing while the rule is out. Metrics: final value after tax, CAGR, volatility, Sharpe (6.5% risk-free), max drawdown, round trips, charges, tax. Rolling 3-year windows (overlapping, so not independent) give the win rates before and after costs.
- **Tax follows the law on the sale date:** short-term 15% and long-term 10% above Rs 1 lakh per financial year until 22 Jul 2024, then 20% and 12.5% above Rs 1.25 lakh; long-term gains were exempt before 1 Apr 2018; holdings bought before 1 Feb 2018 are grandfathered to the 31 Jan 2018 value; cess 3% before Apr 2018 and 4% after; long-term means held MORE than 12 months. Surcharge and loss set-off are not modelled (losses give no relief, which is conservative). Using today's rates on 2019-2021 trades would be wrong and a knowledgeable visitor would notice.
- **Tests (`npm run test:quant`, `scripts/test-quant.mjs`):** hand-worked examples for each tax rule and the fee model, a second independent implementation (the oracle) compared against the engine over 400 random periods/rules/options to 1e-9, and invariants over every level, preset and option set (costs only reduce value, the blotter replays to the final value, buy and sell alternate, flags agree with the numbers). Run it after any change to `quant.ts`; it must stay green.
- **Look:** two real Windows terminal themes, switchable with `THEME PS|WT`: the PowerShell blue (`#012456` on `#EEEDF0`) and Windows Terminal "Campbell" black, with Campbell's bright ANSI colors for gains (green), losses (red), labels (yellow) and headings (cyan). Flat, hairline panels, mono type, inverse-video for selected items. Campbell's purple is intentionally not used.
- **Learnability:** the lab opens already running a demo (SMA 20/100 on the 2020 crash). Everything has a clickable control; typing is optional and autocompletes. A plain-language verdict sentence sits under the numbers, a 3-step coach strip runs on first visit (`localStorage` key `lab-tour`), and after two misses in a period a hint appears that comes from the engine's own results.
- **Honesty:** the footer lists every assumption and says "past data, not advice".

## 9d. Toggles, motion and card size

- Every expand toggle (cards, tiles, timeline rows) is the shared `WheelToggle`: on hover the circle rolls left half a turn and a label ("Expand" or "Collapse") opens where it was. The roll is a transform, so the card's layout never shifts, and the label never appears on touch devices.
- **One pace for expand and collapse:** `--expand-dur` (0.71s, which is 0.85s sped up 1.2x) with `--ease-expand` (a soft ease-in-out). Change the token, not individual rules.
- **Nothing may re-flow in a single frame.** Height changes animate through `Collapse` (`grid-template-rows` 0fr to 1fr), and grids use `align-items: start`, so a neighbour only moves as the height grows. An opened tile therefore grows downward inside its own column. It does NOT jump to a full-width row; that re-flowed every other tile in one frame and was removed.
- **Safety net for future layouts:** `useSmoothLayout` in `App.tsx` records the position of every `.card`, `.banner` and `.reel` in the current section when any `.expand-head`, `.banner-head` or `.tl-head` is clicked, then glides whatever moved discretely from its old spot to its new one with `--expand-dur`/`--ease-expand`. It works in content coordinates, so scrolling is ignored, skips resized elements (to avoid distorting content) and respects reduced motion. New sections that use the shared components and these class names get this for free; if you introduce a new kind of card, give it the class `card` or `banner`.
- **Do not shrink cards to fit a short window.** Tiles keep the reference's generous size. A section taller than the screen scrolls inside itself before handing over to the next section; that is the intended fallback, not a bug to fix by compacting.

## 9e. Deploying to Vercel

- `vercel.json` pins `framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`, a SPA rewrite that leaves real files alone, and long-cache headers for hashed assets.
- **`installCommand` sets `ONNXRUNTIME_NODE_INSTALL=skip`.** transformers.js depends on `onnxruntime-node`, whose postinstall downloads large CUDA binaries on Linux. The site only uses the browser build, so the download is pointless and can slow or fail an install. `.npmrc` repeats the setting for local installs.
- `engines.node` is `>=20.19`; Vercel's default Node satisfies it. Use `npm ci` (lockfile is committed).
- The build output is about 28 MB because the onnxruntime WebAssembly runtime (about 27 MB) is shipped as a static file and loaded only on the first search. That is well within limits; do not "fix" it by loading from a CDN, since the pinned onnxruntime version is a dev build that may not exist there.
- Imports are case-sensitive on Linux. Keep file names and import paths identical in case (a check of all relative imports passed).
- Scripts under `scripts/` run only on a developer machine (`npm run index`, `npm run data`, `npm run test:quant`) and are not part of the Vercel build. Re-run `npm run index` after editing `src/data.ts` and commit the regenerated `public/search-index.json`.

## 10. Hard-won rules (do not repeat these bugs)

1. **Never add state to `class` from outside React.** The reveal observer originally added `is-in` by hand; React rewrote `class` on re-render and cards snapped invisible after toggling. Reveal state is the data attribute `data-in`. Anything DOM-added by an effect must use `data-*`.
2. **Lazy-loading images inside the off-screen pager can leave them blank.** Screenshots load eagerly and fade in on `load`, over a neutral skeleton so there is no white flash.
3. **First paint must not animate for deep links.** The pager positions the track instantly on mount.
4. **`inert` on collapsed content** keeps keyboard focus out of hidden cards.
5. **Do not rely on `100vh` fitting by luck.** Any added content should be re-checked at about 870px and about 950px viewport height.
6. **The PDF must be served as a file**, not rewritten to `index.html` (see `vercel.json`).

## 11. How to change things

- **Add a project:** add an object to `projects` in `src/data.ts` (slug, title, tagline, summary, tags, color variable, stack, facts, links). Every project card must link its GitHub repo (label `GitHub`), plus a live site when one exists. Hackathon entries carry a `repo` field too. Blog entries do not link repos; they link the live write-up or demo only. Add `shot` (path in `public/shots/`) or `diagram` or neither (stack placeholder). Recheck the section still fits one screen.
- **Add a blog:** add to `blogs` in `src/data.ts` with a `metric` for the placeholder. The write-up page is generated from `sections`.
- **Add a section:** add a page component, then an entry in the `sections` array in `src/App.tsx`. The pager, sidebar, dots and URLs follow automatically. Give it its own accent in `palette.ts` order if needed.
- **Change colors:** edit the `--c-*` tokens in both the light and dark blocks of `styles.css`. Keep white text contrast and keep dark variants less chromatic than light.
- **Change timing:** `DURATION` and `COOLDOWN` at the top of `src/Pager.tsx`.
- **Replace the photo:** crop 4:5 around the face, resize to 480x600, save to `public/varun.jpg`.
- **Replace the resume:** overwrite `public/varun_resume_aiqa.pdf`.

## 12. Verifying a change

1. `npm run build` must pass (it runs `tsc`).
2. Serve the build on the LAN with `npx vite preview --host 0.0.0.0` and open it in Chrome on the other machine; check every section in light and dark, expand one card per section, and scroll through all five sections with the wheel.
3. Check overflow per panel in the console: `panel.scrollHeight - panel.clientHeight` should be 0 (under 40 is tolerated).
4. Check no console errors and that `/varun_resume_aiqa.pdf` returns a real PDF.

## 13. Repository rules

- Commits are authored only by the owner (`varuntripathi-029`). No co-author trailers and no AI tool names in commit messages.
- Keep secrets out: `.env*`, key files and `.claude/` are git-ignored. The root copy of the resume is ignored; only `public/` is served.

## 12. Visitor counts, the note list and /admin

- **Server:** one Vercel function, `api/pulse.ts`, backed by Upstash Redis (REST). Variables: `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `ADMIN_PASSPHRASE`, optional `STATS_PREFIX` (keeps test data apart). Real values live only in Vercel and in the git-ignored `.env.local`; `.env.example` lists the names.
- **Counting** (`src/pulse.ts`, called from `App.tsx`): each section or write-up landed on is one view. A random id in localStorage makes one person one unique visitor (HyperLogLog), no cookies, no IP stored. Local hosts, Do Not Track and the owner's own browser (set after signing in to /admin) are skipped.
- **Emails** are opt-in only: the form under Find me (`Subscribe.tsx`) says what the address is used for, has a hidden honeypot field and a per-client hourly limit.
- **/admin** (`pages/Admin.tsx`): not linked anywhere, `noindex` by meta and `X-Robots-Tag`. The passphrase is checked on the server with a constant-time compare, with a lockout of 10 wrong tries per hour per client. Shows visitors, visits, section views, 30-day bars, sections, referrers, countries, and the email list with copy-all and CSV.
- **Local:** `npm run dev` serves `/api/pulse` through a small Vite plugin using `.env.local`. Use `STATS_PREFIX=test` there and delete `test:*` keys afterwards.
- **Quarterly reset:** counts are stored per calendar month (`pf:YYYY-MM:...`) and every key is set to expire at 00:00 IST on 1 Jan, 1 Apr, 1 Jul and 1 Oct (`EXPIREAT`), so each quarter starts from zero with no cron job and the free database stays small. `/admin` shows the whole quarter or any one of its three months (unique visitors across months use `PFCOUNT` over several keys, so they are not double counted). Emails are the one thing that is never reset.
- Never add the admin path to the sidebar, search index or sitemap, and never print the passphrase or tokens in logs or chat.

## 13. The hero card

- The portrait sits **beside** the words (photo 120x150, which is the size to keep, with the handwritten "yes, a real person" under it) in the top-left corner of the card, on the same padding as the text, with the words aligned to its top. The card has generous padding (44px by 48px) and a 31px headline so it does not feel cramped. Below 560px it stacks.
- The Experience page is two independent columns (`.exp-col`): hero then the Experience timeline on the left, "Now", Find me, Paper Hands, the toolbox and the reel on the right. Opening a card only moves its own column, and the timeline rises right under the hero. Below 1000px the columns dissolve (`display: contents`) and `order` restores hero, Now/Find me, Experience, toolbox.
- Pressing the portrait (it is a button) opens it large in a dialog (`Portrait.tsx`, `data-overlay="photo"`, so the pager ignores arrow keys while it is open). Click outside, the close button or Esc dismisses it and focus returns to the portrait. The source image is 480x600, so replace `public/varun.jpg` with a larger crop if it should be sharper when enlarged.
