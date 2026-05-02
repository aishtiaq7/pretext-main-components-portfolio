import type { CSSProperties } from 'react'

/**
 * Decorative paperclip that hangs over the top-right edge of a section page.
 * Drop into any section whose root is a position-relative wrapper. Pass `style`
 * to override anchoring (top/right), size, rotation, etc. per-instance.
 */
type Props = {
  style?: CSSProperties
}

const BASE_STYLE: CSSProperties = {
  position: 'absolute',
  top: -15,
  right: 64,
  width: 34,
  height: 'auto',
  zIndex: 3,
  pointerEvents: 'none',
  transform: 'rotate(6deg)',
  transformOrigin: 'top center',
}

export function SectionPaperclip({ style }: Props = {}) {
  return (
    <img
      src="/photos/true_paper_clip.png"
      alt=""
      draggable={false}
      aria-hidden="true"
      style={{ ...BASE_STYLE, ...style }}
    />
  )
}
