# My Preferred Output Format

Reference this file with `@my-output-format.md` when you want Claude to present
information in this exact style. This is a living example — update it as your
preferences evolve.

## Format Principles
- **Wide tables** — one row per item, all relevant values inline (not stacked)
- **Grouped by category** with emoji/icon prefixes for quick visual scanning
- **IDs as anchors** — every item has a short stable ID for easy reference
- **Compact summary** at the bottom grouping items into clusters
- **Bold = changed** in the latest revision, so diffs are easy to spot
- **Explicit reference syntax** at the end showing how to address items by ID or cluster

## Example (entity layout snapshot)

Here's the wide table — one row per visible item, all current values inline:

| Category | ID | (x, y) | rotate° | Content / Label | Sample values (style / size / extras) |
|---|---|---|---|---|---|
| 📄 Page | header-zone | (0, 0) | — | invisible drag-blocker | 8000×1120 px • fixed • borderless |
| 📄 Page | brand-page | (3, 10) | — | "Awshaf Ishtiaque" (hero) | 1100×220 px • fixed • borderless |
| 📄 Page | clock-page | (3, 16) | — | Notebook + clock + reflow text | 1500×1100 px • fixed |
| 📄 Page | three-page | (5, 31) | +8 | 3D gold cube | 420×420 px • draggable • borderless |
| 📄 Page | text-page | (12, 38) | −6 | Rabbit Hole + Alice quote | 480×340 px • draggable • borderless |
| ✏️ Doodle (C3 Reflow) | rf-1 | (52, 18) | −15 | "Drop a red word here — lines bend around the obstacle." | Patrick Hand 1.2rem • #3a3530 • opacity 0.82 • maxWidth 200 |
| ✏️ Doodle (C3 Reflow) | rf-2 | (52, 22) | −20 | "Every obstacle reshapes the paragraph. Deadlines act like gravity." | Patrick Hand 1.2rem • maxWidth 200 |
| ✏️ Doodle (C3 Reflow) | rf-3 | (52, 26) | −12 | "Scope creep warps layout. Text has to respect the red words." | Patrick Hand 1.2rem • maxWidth 200 |
| ✨ Accent (C4 Emoji) | em-1 | (3, 13) | −15 | ⭐ (star) | system-ui 2.2rem • #c8b882 • pinned |
| ✨ Accent (C4 Emoji) | em-2 | (6, 13) | −25 | 🚀 (rocket) | system-ui 2.2rem • pinned |
| ✨ Accent (C4 Emoji) | em-3 | (9, 13) | −18 | 💡 (bulb) | system-ui 2.2rem • pinned |
| 🔴 Obstacle (C5) | obs-deadline | (44, 18) | −12 | "deadline" | Permanent Marker 2.6rem • 230×50 box • draggable |
| 🔴 Obstacle (C5) | obs-asap | (52, 22) | −20 | "ASAP" (over rf-2) | Rock Salt 2.4rem • 170×48 • draggable |
| 🔴 Obstacle (C5) | obs-scope-creep | (52, 26) | −16 | "scope creep" (over rf-3) | Caveat 2.6rem bold • 225×45 • draggable |
| 📦 Section | section-about | (36, 34) | −0.5 | about-block component | 2200×1600 px • pinned (dashed when unpinned) |
| 📦 Section | section-photos | (35, 58) | +0.5 | photo-gallery component (3 polaroids) | 2400×1800 px • pinned |
| 📦 Section | section-about-2 | (36, 84) | −0.5 | about-block component (duplicate) | 2200×1600 px • pinned |

## Compact summary by cluster

| Cluster | Type | Count | Anchor x | y range | Rotation | Status |
|---|---|---|---|---|---|---|
| C1 | Plain Text | 3 | 28 | 18-26 | −14 to −22 | 🚫 hidden (commented) |
| C2 | Thought | 2 | 40 | 18-22 | −16, −20 | 🚫 hidden (commented) |
| C3 | Reflow Paragraph | 3 | 52 | 18, 22, 26 | −12 to −20 | ✅ visible |
| C4 | Emoji | 3 | 3, 6, 9 | 13 | −15 to −25 | ✅ visible (new pos, under brand) |
| C5 | Red Obstacle | 3 | 44, 52, 52 | 18, 22, 26 | −12 to −20 | ✅ visible (new: 1 left, 2 over) |
| — | Pages | 5 | scattered | 0-38 | 0, +8, −6 | ✅ visible |
| — | Sections | 3 | ~36 | 34, 58, 84 | ±0.5 | ✅ visible |

**Bold values = changed in the latest round.**

## Spatial map (LEADS every layout snapshot)

The map comes FIRST — top of the output, before any tables. Then the wide
table, cluster summary, and reference syntax follow. Render it to scale:
1 char ≈ 2% x, rows labeled with real y values, boxes drawn to entity
footprint scale.

**ALWAYS render the FULL map — every occupied row, every entity. Never a
truncated or sample version.** The full view is the point: composition,
empty space, and clusters must all be visible at once.

```
 x→   0    10   20   30   40   50   60   70   80   90  100
      ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
y  0  ░░░░░░░░░░░░ header-zone (drag-blocker) ░░░░░░░░░░░
   7  ·                                     ◇ cube +8°
  13  ⭐🚀💡 ┌─clock-page─┐ SHIP         💡tl  💡tr
  16  ·     │ notebook + │ DEPLOY   rf-1¶
  19  ·     │ clock +    │ REFACTOR     💡bl  💡br
  23  ·     │ reflow demo│ HOTFIX             rf-2¶
  27  ·     └────────────┘  ═══ brand hero ═══
  30  ·    ┌─about───┐ 🚀rkt      ⌐subtag¬  [alice −4°]
  31  ·    │         │   ✍hw-1
  39  ·    │         │         ✍hw-2
  41  ·    └─────────┘
  42  ·                                    rf-3¶
  45  ·         ┌─photos──┐
  50  ·         │ 📷 📷 📷 │
  55  ·         │         │              🖼sk-1
  58  ·         │         │ [▶ button-1]
  60  ·         │         │               rf-4¶
  63  ·         └─────────┘
  66  ·                                       ✍w3 ┐
  69  ·                                 ✍w1  🖼sk-5│(hidden)
  72  ·                                    ✍w2    ┘
      ├─────────── everything below y≈75 empty ────────┤
 100  └────────────────────────────────────────────────┘
```

(The map above is the live layout as of 2026-07-29 — keep it current when
entities move, so this doc doubles as the latest snapshot.)

Always close the map with this one-line legend (only the symbols actually used):

> **Legend:** `¶` reflow para • `✍` handwriting • `◇` 3D cube • `🖼` sketch/image •
> `📷` photo gallery • `▶` button • `░` invisible region • `·` empty row filler •
> `┌─┐` box = real footprint • `+N°` rotation • *(hidden)* = manual-reveal
>
> Two kinds of marks: **literal** (emoji entities like ⭐🚀💡 and red obstacle
> words appear as themselves) vs **symbolic** (emoji standing in for SVG/raster
> assets, suffixed with an ID fragment — e.g. `💡tl` = obs-tracker-tl lightbulb SVG).

Mark hidden/manual-reveal entities explicitly — they're invisible on load.

## Reference syntax

To move or modify anything, reference by ID or cluster:

- `"rf-2 to y=20"` — moves just that one reflow paragraph
- `"C5 to x=80"` — moves all 3 obstacles
- `"three-page rotate to 15"` — changes cube tilt
