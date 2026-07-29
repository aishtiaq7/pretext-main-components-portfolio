---
name: add-entity
description: Interactive wizard for adding canvas entities AND timeline choreography (staged reveals, camera moves, SFX). Use when the user wants to add/edit entities, or says things like "at this time show X", "after the intro, reveal Y", "add a scene", "play a sound when Z".
---

# Add Entity / Timeline Wizard

You are helping the user grow their notebook-canvas portfolio. Requests come in
two flavors — often mixed in one message:

- **ENTITY** — "add a red word / paragraph / sketch / emoji / button…"
- **TIMELINE** — "at this point, X should reveal / the camera should zoom / play a sound…"

## Step 0 — Load context first

Before parsing anything, read:
1. `object-types.md` — type decision tree + required fields
2. The relevant `src/entities/*.ts` files (current instances + factories in `factories.ts`)
3. For timeline requests: `src/motion/scenes.ts` (SCENES array) and skim
   `src/motion/MotionController.ts` (priming + lazy-build rules below)

## Step 1 — Parse the user's lines

### Entity grammar (one line per entity)
> **type** → **content/asset** → **where** → **quirks** (optional)

- Type picks the factory + target file. Match via object-types.md decision tree.
- Content is the only required input. For paragraphs, a topic is enough — draft
  the text yourself, user edits after.
- "Where" is resolved by YOU: anchor phrases ("below rf-4", "right of the
  rocket", "continuing the emoji row") → read the anchor's x/y from the data
  files and offset. Coordinates are % of the 8000px canvas (1% = 80px).
- Quirks override factory defaults: pinned/draggable, rotate, size, maxWidth,
  triggerId, autoplay/manual, no-reflow, faint.
- Cluster shorthand is valid: "column of 5 at x:85, spaced like the x:38
  column", "grid of", "scattered along", "alternating tilt", "same style as ID".

### Timeline grammar (one line per beat)
> **when** → **what happens** → **camera** (optional) → **sound** (optional)

Examples the user may say:
- "after the welcome scene, reveal hw-sketch-2 with the chalk sound"
- "scene 4: pan to the photo gallery, zoom in tight, hold 6s"
- "when button-2 is clicked, start the whole sequence from scene 2"

Map each beat to a `Scene` entry in `src/motion/scenes.ts`:
`{ id, triggerId, focus?, sfx?, panDuration?, holdDuration? }`
- **when** → position in the SCENES array (order IS the schedule; holds are the gaps)
- **what happens** → `triggerId` of the target entity (`triggers.play(id)` fires it)
- **camera** → `focus` via `focusForEntity(triggerId, zoom)` or explicit `{x,y,zoom}`;
  omit focus = "stay where the user is". Zoom range 0.15–3.0.
- **sound** → `sfx` file path under `public/sounds/`

## Step 2 — HARD timeline constraints (browser gesture rules)

These exist because browsers block media not initiated by a user gesture.
Violating them produces bugs that only show on mobile / first visit:

1. **All delayed audio must be declared in SCENES (or on a Button) before the
   first Play click.** `MotionController.play()` primes every distinct `sfx`
   in SCENES synchronously inside the first click's gesture stack — that is the
   ONLY reason later-scene sounds are allowed to play. A sound fired later from
   a `setTimeout`/rAF/timeline callback that was NOT in that primed set will be
   silently blocked. So: new sound ⇒ it must live in a scene's `sfx` field (or
   a button's `hoverSound`/`clickSound`, which prime themselves in-gesture).
   Never invent a side-channel `audio.play()` call.
2. **The master timeline lazy-builds ONCE on first `motion.play()` and is
   cached.** Scenes are read at build time — editing SCENES is fine (rebuild on
   reload), but never write code that appends scenes at runtime after playback
   has started; they will never run.
3. **Any entity that appears mid-timeline needs `revealMode: 'manual'` + a
   unique `triggerId`**, so it mounts hidden and registers a handle in
   `store/triggers.ts`. The handwriting factory supports this; other entity
   types would need a handle registered — flag this to the user before
   inventing one.
4. **`focus` derivation needs the entity findable**: `focusForEntity` looks the
   triggerId up in ENTITIES and uses `imgW`/`imgH`. If those are missing, pass
   an explicit `focus: {x, y, zoom}`.
5. **`holdDuration` must cover the entity's own animation length** (e.g. the
   handwriting JSON's duration + ~0.2s buffer — see the comment block in
   scenes.ts). If the user adds a new recording, ask for its length or read the
   JSON's timing data; never guess.

## Step 3 — Interview for missing slots only

Use AskUserQuestion (multiple choice) ONLY for slots you cannot infer:
- Entity: ambiguous type → offer the 2–3 closest types; ambiguous placement →
  offer concrete anchors built from existing IDs.
- Timeline: sequence position (before/after which scene), camera (stay / pan
  wide 0.5 / mid 0.9 / tight 1.2+), sound (pencil-scribe / chalk / new file /
  none), hold duration if a new recording is involved.
Never ask about things factories default (font, color, opacity, panDuration).

## Step 4 — Propose, then write

1. Echo the resolved entries — actual `EntityDef` / `Scene` literals — and wait
   for confirmation BEFORE editing files.
2. Write entities into the matching `src/entities/*.ts`; scenes into
   `src/motion/scenes.ts` (respecting order); new button actions into
   `buttonActions` in `App.tsx`.
3. Verify: `nvm use node && npx tsc -b` must pass.
4. Report back per `my-output-format.md`:
   - the entity snapshot table (bold = changed), and
   - a timeline table when scenes changed:

     | # | Scene | Trigger → entity | Camera (x, y, zoom) | SFX | Pan | Hold |

   End with the reference-syntax reminder ("rf-2 to y=20", "scene-2 hold 9s").

## When behavior doesn't fit

If a request needs a new entity type, a runtime-appended scene, or audio outside
the priming path — STOP and ask the user, presenting the constraint and the
closest compliant alternative.
