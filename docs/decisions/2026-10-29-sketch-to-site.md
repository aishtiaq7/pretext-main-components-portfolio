# Decisions · sketch-to-site (clickable ink + notebook intake)

Started 2026-10-29. Driven by `/consult`. One block per turn.

status: closed
Board: https://claude.ai/artifact/28eCPSiDqq63VTho1DwMYo
slug: 092a44a2-41a8-474e-bfaa-b826028bb4b4
version: 1793525569-d886 (update after each republish)
source: docs/decisions/2026-10-29-sketch-to-site.board.html

| # | Block | Status |
|---|-------|--------|
| 1 | Intake format: how drawings reach Claude | ✅ |
| 2 | Asset pipeline: static PNG vs traced SVG vs recorded ink | ✅ |
| 3 | Interaction model: hit area, logic location, gating, action keys | ✅ |
| 4 | Timeline model: sources `click:` `done: +Ns` `load +Ns`, first wins; scenes.ts folds into entities, staged | ✅ |
| 5 | Schema and types: universal vs handwriting-only fields, retire revealMode/autoplay, triggerId defaults to id | ▶ open |
| 6 | Layout authoring: 1b `revealedBy` ✅, positions typed by hand for now ✅ | ✅ |
| 7 | Cross-cutting checklist: touch tap vs pan, reduced motion, keyboard, perfect-freehand cost | ○ |
| 8 | Routes: a clean second notebook at `/freshpage1` under the same TopHeader (added 2026-10-30) | ○ |

## Vision (user, 2026-10-29)

Digital notebook that does what paper cannot: a drawing is clickable, clicking it
starts the next scribble (its own timeline), which in turn becomes clickable. A chain
of "see → click → next appears → click". Writings do not move around; they reveal.

## Block 1 · Intake format ✅

Decision: drawings arrive as the user's own stroke JSON, recorded in the in-repo
`ink-studio` capture tool. That JSON is already the format `HandwrittenEntry` plays
back. No photo pipeline or legend needed for ink. Files go in `public/handwriting/`.

## Block 2 · Asset pipeline ✅

Decision: every new drawing is recorded ink (animates on reveal). Existing PNG
sketches in `images.ts` stay static as they are. No tracing step.

## Block 3 · Interaction model ✅

- Hit area (2026-10-29): **B, whole drawing, ink pixels only** via
  `pointer-events: visiblePainted` on the inline SVG, same as `InteractiveButton`.
  C (stroke groups, needs `group` on `StoredStroke` + a group field in ink-studio
  capture) stays possible later without breaking B.
- Logic location (2026-10-29): **central `actions` and `guards` registries keyed
  by strings** in a new `src/actions.ts`. Entities stay data-only
  (`onClickAction: string | string[]`, `enabledWhen?: string`). The existing
  `buttonActions` map in App.tsx folds into it. Click flow:
  pointerup on ink → gate (progress = 1) → guard → resolver → action(ctx, arg).
- Gating + keys (2026-10-29): gating fixed at progress 1, guards may tighten, never
  loosen. Keys `trigger:` `link:` `pan:` `sfx:`, arrays allowed.

## Block 6 · Layout authoring ▶ (pulled forward)

- Hand-off: settled that the spec lives **on the entity** (no manifest table). User
  gives five facts per drawing (JSON, id, place, revealed-by, click) in chat or
  writes the `handwriting({...})` call directly.
- Hand-off, who holds the arrow: **REOPENED 2026-10-30**. User picked 1a, then
  reconsidered after hearing 1b's long-run case. User's framing: "where the foreign
  key column lives". Board rewritten as a plain-language explainer (parts 1–4) with
  both options side by side. Claude's recommendation: **1b** (`revealedBy` on the
  revealed entity) because non-click reveals (timeline, enter-view, hover) fit the
  same field instead of a second file. 1a is right if smallest change wins.
  Switching either way later is a mechanical string rewrite.
- **LOCKED 2026-10-30: 1b.** `revealedBy` on the revealed entity; `onClickAction`
  kept for non-chain extras (link, sfx, pan).
- Placement ✅ (2026-10-30): **type and iterate** for now. Dev overlay deferred until
  it gets annoying.

## Block 4 · Timeline model ▶ (opened 2026-10-30)

User asked: "can't we have both" click-driven and auto-advance? Yes via multi-source
`revealedBy` arrays, first wins. Proposed v1 sources: `click:<id>`, `done:<id> [+Ns]`,
`load [+Ns]`. User also asked whether scenes.ts and handwriting.ts can merge into one
comprehensive entity → yes: focus→`camera:{zoom}`, sfx→`onReveal:'sfx:…'`,
holdDuration→`done:<id> +Ns` on the next drawing, order→the chain. MotionController
shrinks to camera-pan-on-reveal + firing `done:`. Recommend staged: click chain first,
then migrate the 3 scenes. Also noted for block 5: `triggerId` could default to `id`;
`revealedBy` subsumes `revealMode` + `autoplay`.

Decision ✅ (2026-11-01): user replied "ok i get what you are saying now, what's next";
taken as yes to the recommendation. Sources `click:<id>`, `done:<id> [+Ns]`,
`load [+Ns]`, arrays with first-wins. scenes.ts folds into entity fields as a staged
second step (click chain first, then migrate the 3 scenes).

## Block 5 · Schema and types ▶ (opened 2026-11-01)

Six fields from blocks 3/4/6: `revealedBy`, `clickable`, `onClickAction`,
`enabledWhen`, `onReveal`, `camera`.
- Scope: universal on `EntityDef` (rec) vs handwriting-only.
- Retire `revealMode` + `autoplay` → `revealedBy` (rewrite 5 entries).
- `triggerId` defaults to `id`, kept as optional alias during migration.
- No new type; object-types.md gets a shared "Reveal and click" section.

Decision ✅ (2026-11-01): **universal, "one source of truth"**. All six fields on
`EntityDef`. Retire `revealMode` + `autoplay`. `triggerId` defaults to `id`. No new
type.

## Implementation notes (for the build plan, not decisions)

- Work happens on branch `feat/clickable-ink-chain` (created 2026-11-01 from
  `ai/skilladded`; docs/ carried over, uncommitted).
- Step 2 of the migration **deletes `src/motion/scenes.ts`** once the three scenes
  live on their entities; MotionController shrinks to camera-on-reveal + `done:`.
- Board was NOT republished on 2026-11-01 for blocks 5/7 at the user's request
  ("converse in chat, not artifact"); it lags the log by these entries. Catch up on
  the next republish.

## Block 7 · Cross-cutting checklist ▶ (opened 2026-11-01)

Defaults Claude will apply unless the user objects:
- Phones: 4 px move threshold = click vs pan; two-finger gesture never clicks
  (`isMultiTouchActive` already exists).
- Reduced motion: skip stroke animation, show finished ink, clickable at once.
  `done:<id> +Ns` delays still honoured so pacing survives without motion (no
  instant cascade).
- Keyboard: clickable drawings get `tabIndex=0`, `role="button"`, `aria-label`,
  Enter/Space run the same to-do list; focus-visible outline from index.css.
- Performance: cache finished strokes' path `d`; drive progress by ref (DOM attr
  updates) instead of `setProgress` per frame; no rAF at rest.

User corrections (2026-11-01):
- **Reduced motion: ink animation ALWAYS plays**, never cut. Claude's rec on top:
  under reduced motion make camera pans instant cuts and keep jitter off (already),
  since pans/zooms are the motion-sickness triggers, not slow ink.
- Perf rewrite of HandwrittenEntry: **now** (user priority is Excalidraw-level
  smoothness). Cache finished stroke outlines; drive progress via ref/DOM attr, not
  setState per frame; no rAF at rest. Culling of off-screen entities held in reserve.
- Keyboard: defaults stand (tabIndex, role=button, aria-label, Enter/Space, focus
  outline). Explained in chat with example.

## Block 5 addendum · normalized entity shape (user, 2026-11-01)

User wants every entity to carry every field, with explicit empty/default values
when not applicable ("consistent, like every row has every column"). Options:
(a) new six fields required-with-defaults now, legacy optionals normalized in a
follow-up; (b) normalize all ~40 fields now; (c) later: group per-feature fields
into sub-objects (`ink`, `button`, `obstacle`). Rec: (a).

Decision ✅ (rec) (2026-11-01): user: "if normalize means consistent entities, fine".
Scope per recommendation (a): six new fields required-with-defaults now; legacy
optional fields normalized in a follow-up commit on the same branch.

## Block 7 · closed (2026-11-01)

- Keyboard ✅: **no Tab stops for now** (`tabIndex=-1`, no role). Keep the option:
  normalized field `tabOrder: number | null` (default null). When set, the entity
  becomes focusable and clickable entities sort by it. Nothing else to build now.
- Reduced motion ✅: ink animation always plays; camera pans become instant cuts.
- Phones ✅: 4 px threshold, multi-touch never clicks.
- Performance ✅: HandwrittenEntry loop rewrite now (cached outlines + ref-driven
  DOM updates + one render at completion). Explained in chat 2026-11-01; user asked
  what it affects → only that file; props/handle/visuals unchanged.

## Block 8 · Routes ▶ (opened 2026-11-01)

User idea: `/freshpage1`, clean canvas, same TopHeader. Vision restated 2026-11-01:
"my digital notebook: PNG sketches, handwriting, clicks, scenes, different content on
different pages; the user clicks to discover more."

Settled 2026-11-01:
- Notebook = `{ entities, pages }` keyed by route; TopHeader outside, one link each.
- **Two kinds of state.** Canvas state (zoom, pan, positions, pins, phone book)
  resets per notebook. **Visitor preferences persist** across notebooks (audio
  muted, minimap/navigator settings) — user's call. **Visitor progress persists**
  too: `played` set + named flags, in a small store, localStorage-backed, so "you
  only get here by clicking through" logic survives route changes and reloads.
- **Custom logic hook.** Action kind `fn:<name>` runs a function from the actions
  registry (`onReveal: 'fn:unlockSecret'`); `set:<flag>` writes a flag; guards read
  flags (`enabledWhen: 'flag:secret'`). Covers "reach sketch X only via the chain".
- Route reading goes through one function so hash → clean paths later is a
  10-line change plus a vercel.json rewrite.

Decision ✅ (2026-11-01): **hash routing now**, route read through `currentRoute()`
so clean paths are a later one-line swap plus a vercel.json rewrite.
`docs/architecture.md` as the long-run source of truth: ✅ user agreed.

## CLOSED 2026-11-01 · all 8 blocks decided

Build order (one commit per step on `feat/clickable-ink-chain`, build + browser
check after each):
0. Docs of truth: `docs/architecture.md`, CLAUDE.md pointer, object-types.md
   "Reveal and click" section.
1. Schema + normalization: six fields + `tabOrder` on `EntityDef`, factories emit
   full rows, 5 handwriting entries → `revealedBy`, startup validator.
2. Registries + progress store: `src/actions.ts` (trigger/link/pan/sfx/fn/set;
   guards after/flag/zoomMin/once), `played` + flags in localStorage, fold
   `buttonActions`.
3. HandwrittenEntry rewrite: cached outlines, ref-driven loop, one render at done,
   click on ink (visiblePainted, 4 px), keyboard behind `tabOrder`.
4. Reveal engine: index by `revealedBy`; click/done/load sources; first-wins;
   `onReveal`; `camera` pan. Play = `click:button-1`. scenes.ts untouched. Verify
   with the 3 welcome drawings.
5. Migrate the 3 scenes onto entities; delete `scenes.ts`; shrink MotionController;
   mute persists.
6. Routes: `currentRoute()` hash reader; notebook config per route; empty
   `freshpage1`; header links; canvas state reset per notebook.
7. Follow-up: legacy field normalization sweep; Chrome Performance check (60 fps
   while animating + panning).

## Long-term memory for agentic work (user question, 2026-11-01)

How do new sessions know the plan? Today: CLAUDE.md (auto-loaded), object-types.md,
this log, the board. Claude's auto-memory is per-machine and not shared with
claude.ai chats, so it must not hold architecture. Rec, as build step 0:
`docs/architecture.md` = current truth (vision, principles, reveal/click model,
phase, next steps); CLAUDE.md gets a "read before architectural work" pointer;
decision logs stay as history. Update architecture.md at the end of every build
session.

## Block 8 · Routes (added 2026-10-30, user idea)

User wants a route like `/freshpage1`: a clean-slate canvas, same TopHeader nav.
No router in deps today; `ENTITIES` and `PAGES` are module constants imported by
App.tsx. Shape of the change: a notebook config keyed by route
(`{ entities, pages }`), App takes the config; hash routing (like ink-studio) or
react-router to be decided here.

Decision: _pending_
