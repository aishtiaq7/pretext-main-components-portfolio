# Object Types — Interactive Notebook Canvas

Reference doc for Claude sessions creating or updating canvas instances.
Follows the table / cluster style defined in [@my-output-format.md](./my-output-format.md).

When the user says *"add a new X"*, first match X against the **Quick Decision Tree**
below. If an existing type's behavior fits, reuse it (just add another data entry to
the right file). If the request introduces a behavior that none of these match, ask
the user whether to create a new type.

---

## Quick Decision Tree

Read the user's intent top-to-bottom and pick the first match:

| If the new thing… | Use type |
|---|---|
| Is a draggable unique-JSX block (notebook, cube, card, hero text) | 📄 **Page** |
| Is a draggable text or SVG that **causes paragraph reflow** (red word, rocket) | 🔴 **Obstacle** |
| Is a draggable image with framer-motion polish (spring, hover, inertia) | 🚀 **Motion Obstacle** (obstacle variant) |
| Is a large bordered box wrapping a React component (photo gallery, about-block) | 📦 **Section** |
| Is a multi-line text paragraph with `maxWidth` that wraps around red obstacles | ✏️ **Reflow Paragraph** (doodle variant) |
| Is a small static text snippet, no reflow, no animation | ✏️ **Doodle (plain)** |
| Is a bold animated punchy word (DEPLOY, ITERATE) with jitter | ✨ **Accent (animated word)** |
| Is a **single emoji** in the header row | ✨ **Accent (emoji / C4)** |
| Is a huge faint background label (CODE, BUILD, SHIP) | 💧 **Watermark** |
| Is a sketched SVG doodle icon with drift/wobble animation | 🖼️ **Image** |
| Is a large draggable placeholder with click-to-activate | 🧩 **Widget** |

If none fit, **ask** the user whether to define a new type.

---

## The Types (complete reference)

### 📄 Page

| Aspect | Value |
|---|---|
| **Defined in** | `App.tsx` `PAGES` array (`PageDef` type in `components/PageWrapper.tsx`) |
| **Rendered by** | `<PageWrapper>` (`renderPage()` switch returns the inner JSX) |
| **State map** | `pagePositions` in App.tsx |
| **Collision** | Uses `pageRegions` (collides with other pages, sections, widgets) |
| **Draggable?** | `fixed: false` → draggable; `fixed: true` → static |
| **Z-index** | 50 |
| **Border?** | `borderless: true` → invisible wrapper; else visible frame (prominent border, no shadow) |
| **Rotation** | Optional `rotate: number` (degrees) |
| **Examples** | `brand-page` hero, `clock-page` notebook, `three-page` cube, `text-page` rabbit hole, `header-zone` drag blocker |

**When to create a Page:** The new thing is its own self-contained mini-app — a notebook with interactive internals, a 3D render, a card with title + quote. It has unique JSX and doesn't fit into any text-based entity pattern.

---

### 🔴 Obstacle

| Aspect | Value |
|---|---|
| **Defined in** | `src/entities/obstacles.ts` |
| **Category** | `'obstacle'` |
| **Rendered by** | `<HandwritingEntity>` (generic text renderer) |
| **Causes reflow** | ✅ yes — registered in `obstacleRects` |
| **Draggable?** | ✅ yes (`pinned: false`) |
| **Collision shape** | `capsule` (pill-shaped carve) for clean wrap around rounded text |
| **Required fields** | `obstacleW`, `obstacleH` (px bounding box for the carve) |
| **Examples** | `obs-deadline`, `obs-asap`, `obs-scope-creep`, `obs-bug` (red handwritten words) |

**When to create an Obstacle:** User says "add a word/thing the text should wrap around" — deadline-style red words, drag-onto-paragraph effects.

---

### 🚀 Motion Obstacle (Obstacle variant)

| Aspect | Value |
|---|---|
| **Defined in** | `src/entities/obstacles.ts` (same file, obstacle category) |
| **Rendered by** | `<MotionObstacle>` — framer-motion polished renderer |
| **Activated via** | `motionDraggable: true` on the entity |
| **Causes reflow** | ✅ yes |
| **Draggable?** | ✅ yes, with **inertia/momentum on release** (smooth deceleration) |
| **Visual polish** | spring entrance • hover scale 1.08 • tap scale 0.94 • inertia on release |
| **Content** | Image-based (uses `imgSrc`, `imgW`, `imgH`) — not text |
| **Examples** | `obs-rocket` (rocket SVG) |

**When to create a Motion Obstacle:** Same semantics as a regular obstacle, but the user wants it to feel more like a premium toy — spring-animated, with inertia decay.

---

### 📦 Section

| Aspect | Value |
|---|---|
| **Defined in** | `src/entities/sections.ts` |
| **Category** | `'section'` |
| **Rendered by** | `<HandwritingEntity>` → `renderSection(componentId)` → `<SectionPhotoGallery>` \| `<SectionAbout>` |
| **Size map** | `SECTION_SIZES` in App.tsx |
| **Collision** | Yes — added to `pageRegions` as a collision region |
| **Draggable?** | Pinnable (pin button toggles) |
| **Border** | Solid grey-brown; dashed red when unpinned (draggable) |
| **Z-index** | 40 |
| **Required fields** | `componentId: 'about-block' \| 'photo-gallery'` |
| **Examples** | `section-about`, `section-photos`, `section-about-2` |

**When to create a Section:** User says "add another About card" or "add another photo gallery." Size is defined in the component file (`SectionAbout.tsx` or `SectionPhotoGallery.tsx`).

---

### ✏️ Reflow Paragraph (Doodle variant)

| Aspect | Value |
|---|---|
| **Defined in** | `src/entities/doodles.ts` |
| **Category** | `'doodle'` |
| **Rendered by** | `<HandwritingEntity>` → `<ReflowText>` (when `maxWidth` is set) |
| **Key field** | `maxWidth: number` (px width constraint triggers reflow) |
| **Causes reflow in others** | ❌ no (paragraphs don't affect each other — intentional) |
| **Wraps around obstacles** | ✅ yes (red obstacles, motion obstacles) |
| **Draggable?** | `pinned: false` → yes; `pinned: true` → static |
| **Bold text** | Set `fontWeight: '700'` — measurement includes it correctly |
| **Examples** | `rf-1`, `rf-2` (draggable), `rf-3`, `rf-4` (pinned) |

**When to create a Reflow Paragraph:** User says "add a long paragraph that wraps around stuff." Two default states — draggable (bold) and pinned (regular).

---

### ✏️ Doodle (plain)

| Aspect | Value |
|---|---|
| **Defined in** | `src/entities/doodles.ts` |
| **Category** | `'doodle'` |
| **Rendered by** | `<HandwritingEntity>` (plain text, no reflow) |
| **Key difference from reflow** | No `maxWidth` → renders as a single-line (or `\n`-separated) static label |
| **Draggable?** | Pinned by default |
| **Examples** | Old cluster C1 (brand, hello-world, FULL STACK), currently all hidden |

**When to create a Doodle:** User says "add a small label/quote/tag" — short, static, no wrapping.

---

### ✨ Accent — Animated Word

| Aspect | Value |
|---|---|
| **Defined in** | `src/entities/accents.ts` |
| **Category** | `'accent'` |
| **Rendered by** | `<HandwritingEntity>` + `useJitter` hook |
| **Animation** | `jitter: 'wobble' \| 'drift' \| 'pulse' \| 'wobble-drift'` |
| **Draggable?** | Pinned (click to freeze/unfreeze animation) |
| **Examples** | DEPLOY, ITERATE, DEBUG (currently hidden/removed from canvas) |

**When to create an Animated Accent:** User says "add a punchy bold word that should jitter / wobble / pulse."

---

### ✨ Accent — Emoji (C4 cluster)

| Aspect | Value |
|---|---|
| **Defined in** | `src/entities/accents.ts` |
| **Category** | `'accent'` |
| **Rendered by** | `<HandwritingEntity>` (system-ui font, emoji as text content) |
| **Animation** | `jitter: 'none'` (static) |
| **Content** | Single Unicode emoji |
| **Draggable?** | Pinned |
| **Convention** | Live in the header row (x: 3, 6, 9 at y: 13) |
| **Examples** | `em-1` ⭐, `em-2` 🚀, `em-3` 💡 |

**When to create an Emoji Accent:** User says "add an emoji next to ___." Keep it pinned and tightly packed with other emojis.

---

### 💧 Watermark

| Aspect | Value |
|---|---|
| **Defined in** | `src/entities/watermarks.ts` |
| **Category** | `'watermark'` |
| **Visual** | Large (10rem+), very low opacity (~0.1), pulse animation |
| **Draggable?** | Pinned |
| **Examples** | CODE, BUILD, SHIP (currently array is empty) |

**When to create a Watermark:** User says "add a huge faded background word."

---

### 🖼️ Image

| Aspect | Value |
|---|---|
| **Defined in** | `src/entities/images.ts` |
| **Category** | `'image'` |
| **Content** | SVG via `imgSrc`, `imgW`, `imgH` |
| **Animation** | Optional drift/wobble via `jitter` |
| **Can be obstacle** | Yes (set `obstacle: true` + `obstacleW` + `obstacleH`) |
| **Examples** | doodle-lightbulb, doodle-coffee (currently array is empty) |

**When to create an Image:** User says "add an SVG icon" that isn't polished enough to need Motion Obstacle treatment.

---

### 🧩 Widget

| Aspect | Value |
|---|---|
| **Defined in** | `src/entities/widgets.ts` |
| **Category** | `'widget'` |
| **Rendered by** | `<HandwritingEntity>` widget branch |
| **Draggable?** | Click to activate, then draggable |
| **Causes reflow** | ✅ yes when active |
| **Pushes other entities** | Yes (collision push-away logic in App.tsx) |
| **Examples** | widget-placeholder (currently removed, constants still exist) |

**When to create a Widget:** User says "add a big interactive block that pushes things when clicked."

---

## How to Add a New Instance — Workflow

1. **Match intent to type** via the Quick Decision Tree above.
2. **Open the matching `src/entities/*.ts` file** (or `PAGES` in `App.tsx` for pages).
3. **Copy the nearest existing entry** and adjust `id`, position, content, etc.
4. **Verify nothing references the removed/changed ID** — search in `App.tsx` for string literals.
5. **Show a snapshot** in [@my-output-format.md](./my-output-format.md) style so the user can confirm.

---

## When Behavior Doesn't Match

If the user requests something that doesn't quite fit any type:

- Red word that should NOT cause reflow → it's really a Doodle (plain), not an Obstacle.
- A tall text block that shouldn't wrap around things → Doodle without `maxWidth`.
- A circular image that should pulse and wrap text → Image with `obstacle: true` + `jitter: 'pulse'`.
- A new behavior (e.g. "text that follows the mouse") → **new type**. Ask the user before creating.

When in doubt, **ask before inventing a new type** — reusing an existing one with a flag is almost always cleaner than adding a category.
