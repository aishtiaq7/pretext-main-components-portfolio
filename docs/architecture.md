# Architecture — Interactive Notebook Canvas

Current truth for the project's architecture. Read this before any architectural
change, in any session. The *why* behind each decision lives in
[docs/decisions/](./decisions/); this file is the *what*. Update it at the end of
every build session.

Last updated: 2026-11-01 · phase: **building the clickable ink chain**
(branch `feat/clickable-ink-chain`).

---

## 1. Vision

A digital notebook that does what paper cannot. Hand-drawn ink (recorded in
`ink-studio`, replayed stroke by stroke) sits on a zoomable 8000×8000 canvas with
PNG sketches, photo sections and small interactive pages. A drawing can be
**clicked**, and clicking it **reveals** the next drawing, which draws itself and
becomes clickable in turn. Different notebooks live on different routes. The visitor
clicks to discover more; nothing moves around, things *appear*.

## 2. Principles

1. **Entities are data.** Every thing on the canvas is a row in `src/entities/*.ts`,
   built by a factory in `factories.ts`. No functions on entities; behaviour is
   referenced by string keys and resolved in registries.
2. **One source of truth, normalized.** Every entity carries every field. Fields
   that do not apply hold an explicit default (`[]`, `null`, `false`, `'static'`),
   the way every row in a table has every column.
3. **Small, validated vocabulary.** Reveal sources, action keys and guard keys are
   short strings with a fixed grammar (section 3). They are parsed once at startup
   and a validator fails loudly on typos, dangling references and unreachable
   entities.
4. **No React state per frame.** Animation writes to the DOM through refs
   (`useJitter`, `ZoomCanvas`, the handwriting loop). React renders on state
   changes only. No `requestAnimationFrame` loop runs while nothing moves.
5. **Zero-config hosting.** Vercel serves `index.html`; routing is hash-based so a
   refresh never 404s. Switching to clean paths later is one function plus a
   `vercel.json` rewrite.
6. **Authored content, DOM rendering.** Entity counts stay in the dozens per
   notebook, so SVG/DOM per entity is the right trade: free ink hit-testing, CSS,
   fonts and accessibility. Viewport culling is held in reserve if a notebook ever
   grows past a couple of hundred entities.

## 3. The model

### 3.1 Entity row (`EntityDef`, `src/types.ts`)

Core fields (position, style, category, size) are unchanged from the original
system; see `object-types.md` for per-type details. The **reveal & click** fields
exist on every entity:

| field | type | default | meaning |
|---|---|---|---|
| `triggerId` | `string` | `id` | name in the phone book (`triggers`); optional alias |
| `revealedBy` | `RevealSource[]` | `['static']` | every way this entity can appear; first to fire wins |
| `clickable` | `boolean` | `false` | the painted ink/asset catches clicks once finished |
| `onClickAction` | `ActionKey[]` | `[]` | to-do list run on click |
| `enabledWhen` | `GuardKey \| null` | `null` | optional rule checked before the to-do list |
| `onReveal` | `ActionKey[]` | `[]` | to-do list run when it is revealed |
| `camera` | `{ zoom, panDuration? } \| null` | `null` | pan/zoom the viewport to it on reveal |
| `tabOrder` | `number \| null` | `null` | when set, keyboard-focusable in this order |

Retired: `revealMode`, `autoplay` (both expressed by `revealedBy`).

### 3.2 Reveal sources (`revealedBy`)

```
'static'                 visible from the start, already finished
'load'                   visible from the start, animates on mount
'load +2s'               hidden, then revealed 2 s after startup
'manual'                 hidden until something calls play() imperatively (legacy timeline)
'click:<triggerId>'      hidden until that entity is clicked
'done:<triggerId> +3s'   hidden until that entity finishes drawing (+ optional delay)
```

An entity may list several. The first to fire reveals it and cancels the rest.

### 3.3 Action keys (`onClickAction`, `onReveal`)

```
'trigger:<triggerId>'    phone book → play() that entity
'link:<url>'             open a link
'pan:<triggerId>'        ease the camera to that entity
'sfx:<path>'             play a sound through AudioController
'fn:<name>'              run a function registered in src/actions.ts
'set:<flag>'             write a visitor-progress flag
```

### 3.4 Guard keys (`enabledWhen`)

```
'after:<triggerId>'      only once that entity has finished drawing
'flag:<name>'            only when the visitor-progress flag is set
'zoomMin:<n>'            only when viewport zoom >= n
'once'                   only the first click on this entity
```

### 3.5 Runtime pieces

```
entities (rows) ──startup──▶ validator ──▶ reveal index  (revealedBy → [entity])
                                        └▶ phone book    (triggerId → live handle)

click on ink ──▶ finished? ──▶ guard ok? ──▶ for key of onClickAction: actions[kind](ctx, arg)
                                                  │
                     reveal engine ◀── 'click:X' fired ── also: 'done:X' when X finishes,
                          │                                     'load' at startup
                          ▼
              reveal entity: unhide, play(), run onReveal, camera pan if set
```

| piece | file | job |
|---|---|---|
| phone book | `src/store/triggers.ts` | `triggerId → { reveal, play, pause, resume, reset }`, registered on mount |
| reveal engine | `src/motion/reveal.ts` (step 4) | indexes `revealedBy`, listens for click/done/load, first-wins, runs `onReveal`, camera |
| actions & guards | `src/actions.ts` (step 2) | string key → function; `ctx` carries entityId, viewport, progress store, panTo |
| progress store | `src/store/progress.ts` (step 2) | `played: Set<triggerId>`, `flags: Set<string>`; localStorage-backed; survives routes and reloads |
| MotionController | `src/motion/MotionController.ts` | transport only: ▶ starts the chain (`revealEngine.onClicked('button-1')`) or resumes; ❚❚ pauses drawings, timers, audio; mute |
| prefs | `src/store/prefs.ts` | visitor preferences (mute), localStorage-backed; distinct from progress and from canvas state |
| ~~scenes.ts~~ | deleted in step 5 | order, camera, sound and holds now live on the entities |

## 4. Rendering pipeline

```
src/entities/*.ts  ──▶  App.tsx maps each row to a component by category
                        ├─ 'button'          → InteractiveButton
                        ├─ motionDraggable   → MotionObstacle
                        └─ everything else   → HandwritingEntity (position, drag, pin)
                                                 └─ handwritingSrc → HandwrittenEntry
                                                      fetch JSON → one <path> per stroke
                                                      rAF loop drives progress 0→1
                                                      registers in the phone book
```

Performance rules for `HandwrittenEntry` (step 3): finished strokes are computed once
and cached; only the stroke being drawn is recomputed per frame; the loop writes
`d` attributes through refs; React renders once on load and once at completion.

Hit testing: the wrapper has `pointer-events: none`; the `<svg>` has
`pointer-events: visiblePainted` so only ink pixels receive events (same trick as
`InteractiveButton`). A pointer that moves more than 4 px is a pan, not a click.
Two-finger gestures never click.

Reduced motion: the ink animation **always plays** (it is the content). Camera pans
become instant cuts. Jitter is already disabled.

## 5. Notebooks and routes (step 6)

- Hash routing: `/#/freshpage1`. `currentRoute()` is the only place that reads the
  URL.
- A notebook is `{ entities, pages }` keyed by route. Home is today's `ENTITIES` and
  `PAGES`; `freshpage1` starts empty. `TopHeader` stays outside the switch and shows
  one link per notebook.
- **Canvas state** (zoom, pan, positions, pins, phone book) resets per notebook.
- **Visitor preferences** (mute) and **visitor progress** (`played`, flags) persist
  across notebooks and reloads in localStorage.

## 6. Build order and status

One commit per step on `feat/clickable-ink-chain`. `npm run build` and a browser
check after each.

- [x] 0. Docs of truth (this file, CLAUDE.md pointer, object-types.md section)
- [x] 1. Schema + normalization: fields on `EntityDef`, factories emit full rows,
      handwriting entries move to `revealedBy`, startup validator + test
- [x] 2. Registries + progress store (`src/actions.ts`, `src/store/progress.ts`)
- [x] 3. `HandwrittenEntry` rewrite: cached outlines, ref-driven loop, click on ink,
      keyboard behind `tabOrder`
- [x] 4. Reveal engine: click / done / load sources, first-wins, `onReveal`, `camera`.
      Play button wired as `click:button-1`. `scenes.ts` untouched (legacy ▶ only)
- [x] 5. Migrate the three scenes onto entities, delete `scenes.ts`, shrink
      MotionController, mute persists
- [ ] 6. Routes: `currentRoute()`, notebook config per route, empty `freshpage1`,
      header links, canvas state reset per notebook
- [ ] 7. Follow-up: legacy optional-field normalization sweep, 60 fps check while a
      drawing animates and the camera pans

## 6b. Dev aids

- `npm run dev` validates the entity list on startup and prints problems to the console.
- In dev the browser exposes `window.__notebook` = `{ revealEngine, triggers, progress, entities }`.
  Useful while testing a chain: `__notebook.revealEngine.pauseAll()` freezes pending
  `done:`/`load:` timers, `__notebook.triggers.play('welcome-2')` reveals by hand,
  `__notebook.progress.reset()` forgets what the visitor reached.

## 7. Recipe: add a drawing to the chain

1. Record it in `ink-studio`, export the JSON into `public/handwriting/`.
2. Add one entry in `src/entities/handwriting.ts`:

```ts
handwriting({
  id: 'hw-welcome-4', x: 86, y: 70, width: 600,
  src: '/handwriting/fourth.json',
  revealedBy: ['click:welcome-3', 'done:welcome-3 +4s'],  // click it, or it comes anyway
  clickable: true,
  onClickAction: ['link:https://github.com/aishtiaq'],
  onReveal: ['sfx:/sounds/chalk-7s.mp3'],
  camera: { zoom: 1.1 },
})
```

3. Run `npm run allTests`; the validator confirms every reference resolves and the
   drawing is reachable.
4. Positions are typed by hand for now. A dev placement overlay is deferred.

## 8. File map (new or changed by this phase)

| path | role |
|---|---|
| `src/types.ts` | `EntityDef` with reveal & click fields; `RevealSource`, `ActionKey`, `GuardKey` |
| `src/entities/factories.ts` | every factory normalizes the behaviour fields |
| `src/entities/reveal.ts` | parse `revealedBy` strings into structured sources |
| `src/entities/validate.ts` | startup validator (DEV) and test helper |
| `src/actions.ts` | actions + guards registries, `Ctx` |
| `src/store/progress.ts` | persisted `played` + `clicked` + flags |
| `src/store/prefs.ts` | persisted visitor preferences (mute) |
| `src/motion/reveal.ts` | reveal engine |
| `src/motion/MotionController.ts` | transport (play / pause / mute); `scenes.ts` deleted |
| `src/components/HandwrittenEntry.tsx` | rewritten loop + click on ink |
| `src/router.ts`, `src/notebooks/` | hash route reader, notebook configs |
| `tests/entities-validate.test.ts` | validator runs against the real entity list |

## 9. Maintenance

- A new architectural decision → run `/consult`, log it under `docs/decisions/`,
  then reflect the outcome here.
- New entity type or variant → `object-types.md` first, then the factory.
- Claude's own memory never holds architecture; this file and the decision logs do.
