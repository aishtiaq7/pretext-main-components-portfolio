/**
 * Decorative paperclip that hangs over the top-right edge of a section page.
 * Drop into any section whose root is `.section-wrap` — it absolutely positions
 * itself relative to the wrapper and overhangs the section-block edge.
 */
export function SectionPaperclip() {
  return (
    <img
      src="/photos/true_paper_clip.png"
      alt=""
      className="section-paperclip section-paperclip-slim"
      draggable={false}
      aria-hidden="true"
    />
  )
}
