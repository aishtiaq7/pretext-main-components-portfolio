// Sibling of the brand hero — a smaller, multi-line handwritten tagline.
// Fixed and borderless like the brand page, but quieter: a different font,
// smaller size, and stacked across 3-4 lines.
export function SubTagline() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      fontFamily: '"Caveat", cursive',
      fontSize: '2.2rem',
      lineHeight: 1.15,
      color: '#3a3530',
      opacity: 0.88,
      transform: 'rotate(-1.5deg)',
    }}>
      <span>designer · engineer · illustrator</span>
      <span>playing at the edges of the web</span>
      <span>notebooks, canvases, code</span>
      <span>that wants to be touched</span>
    </div>
  )
}
