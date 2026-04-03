# What I did

I took the [demo for a editorial engine](https://somnai-dreams.github.io/pretext-demos/the-editorial-engine.html) built with [pretext](https://github.com/chenglou/pretext) by Cheng Lou and I made it fully accessible, with semantic HTML structure, keyboard operability, screen reader support, and `prefers-reduced-motion` compliance. The result is a high-performance text layout demo that meets WCAG 2.2 success criteria while not compromising aesthetics and performance. The orbs are still draggable with the mouse but I also added the possibility of moving them using the keyboard.

In this accessible version, the text is fully selectable and copyable. The visual text lines have `pointer-events` and `user-select` enabled, so users can click and drag to select text just like on any normal webpage. Additionally, a hidden element contains the full readable text in the DOM, ensuring that browser find-in-page works, search engine crawlers can index the content, and screen readers have access to a clean, linear reading experience independent of the visual layout.

### Pretext library usage

Pretext powers the core of the layout engine. The following APIs are used:

| API | Purpose | Where used |
|-----|---------|------------|
| `prepareWithSegments()` | Measures and caches word widths for each paragraph | Text preparation on font load |
| `layoutNextLine()` | Lays out one line of text at a given max width | Column layout engine, called per line, per slot |
| `layoutWithLines()` | Lays out all lines of a prepared text block | Headline fitting |
| `walkLineRanges()` | Iterates line ranges without allocating line objects | Headline binary search, drop cap width |

## Accessibility improvements

### Semantic HTML structure

The app uses proper HTML5 landmarks and semantic elements:

- `<header>`: Fixed bar with controls and interaction hints
- `<main>`: Primary content area
- `<div role="region" lang="es">`: Full readable text accessible to screen readers, crawlers, and find-in-page
- `<section>`: Orb container with descriptive `aria-label`
- `<footer>`: Performance stats and credits
- `<kbd>`: Keyboard shortcuts styled as physical keycaps (with `aria-hidden` to prevent double announcement; sr-only spans provide the text)
- `<cite>`: Book title attribution
- `<nav>`: Keyboard shortcuts section and credits navigation

#### Why correct HTML semantics matter

1. **Users with disabilities**: Screen readers use landmarks (`<header>`, `<main>`, `<footer>`) for navigation. A screen reader user can press a single key to jump between landmarks rather than tabbing through every element. `lang="es"` on the text region tells the screen reader to switch to Spanish pronunciation.

2. **Search engine crawlers**: Crawlers rely on semantic structure to understand content hierarchy. `<h1>` establishes the page topic. `<cite>` identifies referenced works. Content hidden with `display: none` or `visibility: hidden` is ignored by crawlers, but content positioned off-screen (`left: -9999px`) remains indexable. This is why the readable text uses positional hiding rather than display hiding.

3. **AI systems and LLMs**: AI agents parsing web content use the same semantic signals as crawlers. Landmark roles, heading hierarchy, and structured elements allow AI to extract meaning without relying on visual layout.

### Keyboard accessibility

Every interactive element is operable without a mouse:

| Action | Key | With VoiceOver |
|--------|-----|----------------|
| Toggle global pause | `Esc` | `Esc` |
| Navigate to orbs | `Tab` | `Tab` |
| Move focused orb | `Arrow keys` | `Option + Arrow keys` |
| Pause/resume individual orb | `Space` | `Space` |

Orbs are `<button>` elements, which tells VoiceOver to pass arrow keys through to JavaScript instead of consuming them for SR navigation. The `aria-roledescription="draggable orb"` provides a clear role announcement. Each orb's `aria-label` dynamically updates to reflect its pause state: "Press Space to pause" when moving, "Press Space to resume" when paused.

### Screen reader orb interaction discovery

When a VoiceOver user tabs to an orb, they hear: "Golden orb, 1 of 5. Use Option plus arrow keys to move. Press Space to pause." This instruction is critical because VoiceOver normally captures arrow keys for its own navigation. The `role="application"` on each orb button switches VoiceOver into a pass-through mode where arrow keys go directly to the page's JavaScript, enabling orb movement.

When the orb is paused, the label changes to: "Press Space to resume.", so the user always knows the current action available without guessing.

### Screen reader support

- **`aria-live="polite"`**: Announces orb selection, pause/resume, and state changes without interrupting the user
- **`aria-pressed`**: Toggle buttons communicate their on/off state
- **`aria-label`**: Every interactive element has a descriptive, dynamic label

### `prefers-reduced-motion` support

When the user's OS or browser has reduced motion enabled:

- All orb animation stops, orbs render at their initial positions, static
- Text reflows once and stays put
- CSS `scroll-snap-type` and `scroll-behavior: smooth` are disabled
- CSS transitions and animations are suppressed globally via `animation-duration: 0.01ms !important`
- A toggle button allows users to override this preference in-app

### Pause control

- **Global pause** (button or `Esc`): Stops all orbs. Paused orbs freeze in their document position and don't move when the user scrolls.
- **Individual pause** (click or `Space` on a focused orb): Only that orb stops. Other orbs keep moving. This allows users to control exactly which elements are in motion.
- The global pause button reflects the aggregate state. If all orbs are individually paused, it shows "Play"; if all are moving, it shows "Pause".

## Mobile and responsive behavior

The layout adapts to screen size:

| Viewport | Columns | Orbs |
|----------|---------|------|
| > 1000px | 3 columns | Visible, full size |
| 641-1000px | 2 columns | Visible, full size |
| < 640px | 1 column | Hidden |

### Orbs hidden on small screens and high zoom

When the viewport width is below 500px or the browser zoom level reaches 150% or higher, the orbs are completely removed from the DOM. This is not a CSS `display: none`. The React component conditionally unmounts the entire orb `<section>`.

Zoom detection uses `window.outerWidth / window.innerWidth`. When the user zooms the browser, `innerWidth` shrinks while `outerWidth` stays constant, giving the actual zoom ratio.

### Mobile header and footer

On screens below 640px:
- The header stacks vertically (controls on top, hints below)
- The footer stacks vertically (stats centered, credits below)
- Button text and hint font sizes reduce for touch targets
- The full text remains accessible for copy/paste and screen readers

## CSS `scroll-snap-type` and user experience

The app uses native CSS scroll snapping:

```css
html {
  scroll-snap-type: y proximity;
  scroll-behavior: smooth;
}
```

### Accessibility behavior

- Under `prefers-reduced-motion: reduce`, both `scroll-snap-type` and `scroll-behavior: smooth` are disabled entirely, falling back to native browser scroll
- The snap targets are the text "pages" (each viewport-height section of columns), creating a magazine-like reading experience
- Keyboard scroll (`Space`, `Page Down`, `Arrow keys`) works normally. The snap behavior only engages when the scroll naturally lands near a snap point

## WCAG success criteria

The following WCAG 2.2 success criteria are relevant to this project:

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 1.3.1 Info and Relationships | A | Pass | Semantic HTML conveys structure programmatically |
| 1.3.2 Meaningful Sequence | A | Pass | DOM order matches visual reading order |
| 1.3.4 Orientation | AA | Pass | Layout adapts to portrait and landscape |
| 1.4.1 Use of Color | A | Pass | Pause state uses opacity + SR announcement, not color alone |
| 1.4.3 Contrast (Minimum) | AA | Pass | All text meets 4.5:1 ratio |
| 1.4.4 Resize Text | AA | Pass | Text reflows at 200% zoom; orbs removed at 150%+ to prevent obstruction |
| 1.4.10 Reflow | AA | Pass | Single column at narrow viewports, no horizontal scroll |
| 1.4.11 Non-text Contrast | AA | Pass | Focus indicators meet 3:1 against adjacent colors |
| 2.1.1 Keyboard | A | Pass | All functionality available via keyboard |
| 2.1.2 No Keyboard Trap | A | Pass | `scroll-snap-type: proximity` (not `mandatory`), no focus traps |
| 2.2.2 Pause, Stop, Hide | A | Pass | Global and per-orb pause controls, `Esc` shortcut |
| 2.3.3 Animation from Interactions | AAA | Pass | `prefers-reduced-motion` respected, manual toggle available |
| 2.4.1 Bypass Blocks | A | Pass | Landmark navigation via `<header>`, `<main>`, `<footer>` |
| 2.4.3 Focus Order | A | Pass | Tab order follows logical document structure |
| 3.1.1 Language of Page | A | Pass | `lang="en"` on `<html>`, `lang="es"` on Spanish text |
| 3.1.2 Language of Parts | AA | Pass | Spanish text scoped with `lang="es"` |
| 4.1.2 Name, Role, Value | A | Pass | Buttons have labels, toggles have `aria-pressed`, live regions announce changes |

## Tech stack

- [Claude](https://claude.ai/) calculations, editing and README writing.
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/) 5.9
- [Vite](https://vite.dev/) 8
- [@chenglou/pretext](https://github.com/chenglou/pretext) 0.0.3
- [Atkinson Hyperlegible](https://brailleinstitute.org/freefont), font designed by the Braille Institute for maximum readability
