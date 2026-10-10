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
| `src/components.tsx` | `Collapse`, `Timeline`, `ExpandCard`, `ExpandBanner`, `Shot`, `Reel`, `Words`, `PageHead` |
| `src/pages/*.tsx` | One component per section, plus `BlogPost` (the only separate route) |
| `src/styles.css` | Every style. Tokens at the top, later blocks override earlier ones |
| `public/shots/*.jpg` | Real screenshots used inside project and blog tiles |
| `public/varun.jpg` | Portrait, 480x600, 4:5, cropped around the face |

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
| `.exp-grid` | Experience | Two columns `1.12fr / 1fr`. Row 1: hero card and a side stack (Now banner + Find me). Row 2: tech reel. Row 3: Experience card and Skills card |
| `.grid` | generic | Two equal columns, 40px (24px in panels) gap |
| `.grid-top` | Projects, Hackathons | `align-items: start` so an opened card grows alone |
| `.tiles-3` | Projects, Blogs | Six-column grid: tiles 1 to 3 span 2 columns, tiles 4 and up span 3. Five items become three over two |

When a list has an odd count the last tile spans the row so no hole is left.

## 5. The pager (horizontal scrolling)

Sections sit side by side in a horizontal flex track (`.pager`). The user scrolls vertically (mouse wheel or trackpad) and the screen glides **right to left** to the next section. This is deliberate: it is not vertical page scroll.

- **URL is the single source of truth.** `/`, `/projects`, `/hackathons`, `/blogs`, `/leadership` each map to a section. Any path change animates the track. Wheel, keys, dots and sidebar all just change the path (`navigate(path, { replace: true })` for gestures).
- **Animation:** custom `requestAnimationFrame` tween, 780ms, ease-in-out cubic, plus a 220ms cooldown. This is the "not snappy, not slow" sweet spot. Native `scroll-behavior: smooth` is not used because its duration cannot be controlled. Scroll snap is switched off during the tween and restored after.
- **One gesture, one section.** A wheel gesture is a run of events with gaps under 160ms. After one section move the gesture is marked consumed, so trackpad momentum cannot skip several sections.
- **Fallback:** if the active section overflows its panel by more than 40px, wheel scrolls inside it first and only pages on a fresh gesture at its edge.
- **Other inputs:** arrow left/right, arrow down/up, Page Down/Up and Space; the bottom dots; touch swipes (native scroll with snap, URL synced when it settles).
- **First load:** a deep link such as `/blogs` positions the track instantly with no slide.
- **Mobile (<= 760px):** the pager is disabled and sections stack vertically; navigation scrolls into view.

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

Four families, each with one job. Do not use a family outside its role.

| Role | Family | Used for |
|---|---|---|
| Display | **Fraunces** (variable: opsz, wght, SOFT 80, WONK 0) | Hero headline, page titles, tile titles, card titles, blog headings, big metric numbers |
| Reading and UI | **Inter** 400 to 600 | Body copy, nav, buttons, teasers |
| Facts | **JetBrains Mono** 400 and 500 | Tile chips, dates, kickers, badges, stack lists, skill and reel chips, placeholder lists |
| Voice | **Caveat** 500 and 600 | The greeting and the small scribble beside the portrait. One or two uses per page at most |

- Why Fraunces: a soft, slightly warm serif that sits well with the earth pigment palette and keeps the site from reading as another sans-serif template. Weight 480 to 500, tracking -0.02em.
- Why mono for facts: dates, tags and stacks are data, and mono makes them scan as data.
- Caveat is the human aside. Overusing it turns the site into a scrapbook; keep it to short phrases.
- Scale: hero 27px, tile titles 28px (20px in the narrow blog tiles), card titles 24px, blog headings 22px, body 16 to 17px, tile teaser 18px, chips 11 to 13px.
- Uppercase appears only on tile chips (mono, tracked) because the reference does it. Do not add more uppercase labels.
- Line length stays under about 68ch in prose.

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
