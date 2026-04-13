# Portfolio — Interactive Notebook Canvas

## Project Overview
Awshaf Ishtiaque's interactive portfolio. A zoomable 8000x8000px canvas styled as a ruled
notebook, where draggable entities (text, images, sections, widgets) float on paper.
Text reflows around obstacles in real-time. Deployed on Vercel via Git integration.

## Tech Stack
- **React 19** + TypeScript ~5.9 — functional components, hooks only
- **Vite 8** — bundler & dev server
- **Three.js 0.183** — 3D metallic cube demo (ThreeIntro component)
- **@chenglou/pretext 0.0.3** — advanced text layout & reflow around obstacles
- **No CSS framework** — hand-written CSS in `src/index.css`, notebook aesthetic, Google Fonts

### Unused Dependencies (keep for now, do not remove)
- **Framer Motion 12** — not actively used
- **Lenis 1.3** — not actively used

### Unused Files (not in use, do not modify)
- `src/content.ts` — old text content
- `src/orbs.ts` — physics simulation, unused
- `src/renderer.ts` — deprecated renderer logic

## Quick Start
```bash
nvm use node
npm install
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npm run preview    # preview built dist
```

## Folder Structure
```
src/
├── App.tsx                  # Root — canvas events, entity state, collision detection
├── main.tsx                 # React DOM root
├── types.ts                 # EntityDef, FixedRegion, Interval, jitter types
├── constants.ts             # CANVAS=8000, PAN_LIMIT=5000
├── index.css                # All styles — notebook theme, entities, sections, a11y
├── components/
│   ├── HandwritingEntity.tsx  # Renders all 7 entity types, drag-drop, collision, jitter
│   ├── ZoomCanvas.tsx         # Viewport transform (translate + scale)
│   ├── TopHeader.tsx          # Fixed header — logo, name, GitHub/LinkedIn
│   ├── ScrollInputs.tsx       # Right panel — zoom/pan sliders, draggable minimap
│   ├── PageWrapper.tsx        # Draggable page containers on canvas
│   ├── NotebookPage.tsx       # Pretext reflow page with draggable clock obstacle
│   ├── ReflowText.tsx         # Text wrapping around elliptical obstacles
│   ├── ThreeIntro.tsx         # Three.js golden cube scene
│   ├── SectionPhotoGallery.tsx # Polaroid-style photo grid
│   └── SectionAbout.tsx       # About block with inset photo
├── entities/                # Data-driven entity definitions (one file per category)
│   ├── index.ts             # Combines all entity arrays
│   ├── doodles.ts           # ~13 scattered text quotes & snippets
│   ├── accents.ts           # ~13 bold animated words (DEBUG, DEPLOY, etc.)
│   ├── watermarks.ts        # ~10 large faint background text
│   ├── obstacles.ts         # ~15 red draggable text (deadline, ASAP, etc.)
│   ├── images.ts            # ~8 SVG doodle entities with jitter
│   ├── sections.ts          # Photo galleries & about blocks
│   └── widgets.ts           # Large draggable placeholder blocks
├── hooks/
│   ├── useJitter.ts         # DOM-level animation (wobble, drift, pulse) via rAF
│   └── usePrefersReducedMotion.ts  # Accessibility media query hook
└── store/
    └── viewport.ts          # Zoom/pan state via useSyncExternalStore
public/
├── fonts/                   # Atkinson Hyperlegible, JetBrains Mono (self-hosted)
├── doodles/                 # SVG icons (pin, lightbulb, coffee, rocket, etc.)
├── photos/                  # Portrait images for galleries
└── mica-wizard.svg          # Logo/favicon
```

## Architecture

### Canvas Coordinate System
- 8000x8000px virtual canvas, positions stored as **percentages** (0-100)
- Viewport transform: `translate(tx, ty) scale(zoom)` where `tx = -4000 * zoom + panX`
- Zoom range: 0.15-3.0, pan clamped to +/-5000
- Conversion: `PCT_TO_PX = CANVAS / 100 = 80`

### Entity System (data-driven)
7 categories defined in `src/entities/`, all rendered by `HandwritingEntity`:

| Category   | Draggable | Animated     | Causes Reflow | Purpose                    |
|------------|-----------|--------------|---------------|----------------------------|
| doodle     | no        | no           | no            | Decorative text snippets   |
| accent     | no        | yes (jitter) | no            | Bold punchy words          |
| watermark  | no        | pulse        | no            | Large faint background     |
| obstacle   | yes       | no           | yes           | Red text, pushes text away |
| image      | some      | drift        | some          | SVG doodles                |
| section    | pinnable  | no           | no            | Photo galleries, about     |
| widget     | on click  | no           | yes           | Large interactive blocks   |

**IMPORTANT — before creating or updating any instance, consult
[object-types.md](./object-types.md).** It contains the decision tree, behavioral
details, required fields, and example entries for every type (including variants
like Reflow Paragraph, Motion Obstacle, and Emoji Accent). Reuse existing types
where behavior matches; only introduce a new type after user confirmation.

Also follow the presentation conventions in [my-output-format.md](./my-output-format.md)
when showing layout snapshots back to the user.

To add a new entity: create an entry in the matching `src/entities/*.ts` file following the
`EntityDef` type. It auto-renders — no component changes needed.

### State Management
- **Viewport** (zoom, panX, panY): `useSyncExternalStore` in `store/viewport.ts` — no Redux
- **Entity positions**: `useState<Record<id, {x,y}>>` in App.tsx
- **Pinned state**: `useState<Record<id, boolean>>` in App.tsx
- **Active widget**: `useState<string | null>` in App.tsx

### Collision Detection
- Pages and sections register as `FixedRegion` rectangles
- On drag, new position tested against all regions; entity pushed to nearest edge
- 0.3% canvas margin around collisions

### Text Reflow
- `@chenglou/pretext` for font metrics & line layout
- Obstacles treated as ellipses for smooth wrapping
- `ReflowText` computes horizontal extents per text band
- `NotebookPage` uses slot-carving for multi-column layout

### Animation (useJitter hook)
- Direct DOM manipulation via refs — no React re-renders
- requestAnimationFrame loop with per-entity phase offset
- Types: wobble (rotation), drift (translate), pulse (scale), wobble-drift (combined)
- Click accent entities to freeze/unfreeze
- Respects `prefers-reduced-motion`

## Styling
- All styles in `src/index.css` — no CSS modules or Tailwind
- Entity positioning uses inline styles; layout/theme uses CSS classes
- Notebook theme: ruled lines, binding holes, red margin line
- Colors: canvas `#e8e4d9`, header `#111`, margin `#d4a0a0`, accent `#c8b882`, widget `#c83030`
- Handwriting fonts via Google Fonts (Patrick Hand, Caveat, Rock Salt, Indie Flower, etc.)
- Accessibility: focus-visible outlines, sr-only text, reduced motion support

## Deployment
- **Vercel** via Git integration (zero-config, no vercel.json)
- Build command: `tsc -b && vite build` -> `dist/`

## Gotchas & Notes
<!-- Add bugs, quirks, and gotchas here as you encounter them -->
