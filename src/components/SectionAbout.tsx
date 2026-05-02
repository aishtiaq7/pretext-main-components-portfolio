import { SECTION_SIZES } from '../entities/sizes'
import { SectionPaperclip } from './SectionPaperclip'

const { w: ABOUT_W, h: ABOUT_H } = SECTION_SIZES['about-block']

const ABOUT_PARAGRAPHS = [
  `I build things for the web. Not just features — I build the systems around features. The pipelines that deliver them, the tests that catch them when they break, the documentation that helps the next person understand what I was thinking at 2 AM.`,
  `I started at SFU studying computer science, left with a degree and a startup idea. The startup taught me more about shipping than any course ever did. It taught me about deadlines that actually matter, users who actually complain, and servers that actually go down on a Friday night.`,
  `Now I teach. 40 students last year learned React from me. Some of them are already better than I was at their stage. That's the point. I write code that other people will read, and I explain code that other people wrote. Both skills matter more than most developers think.`,
  `Vancouver is home. The mountains remind me that the biggest things were built slowly.`,
]

export function SectionAbout() {
  return (
    <div className="section-wrap" style={{ width: ABOUT_W, height: ABOUT_H }}>
      <SectionPaperclip />

      <div className="section-block section-block-about" style={{ width: '100%', height: '100%' }}>
        {/* Notebook ruled lines */}
        <div className="section-ruled-bg" />

        {/* Header */}
        <div className="section-header">
          <span className="section-title">About</span>
          <span className="section-subtitle">// who writes this code</span>
        </div>

        {/* Content area with photo inset */}
        <div className="section-about-content">
          <div className="section-about-text">
            {ABOUT_PARAGRAPHS.map((p, i) => (
              <p key={i} className="section-about-paragraph">
                {p}
              </p>
            ))}
          </div>

          {/* Inset photo */}
          <div className="section-about-photo-wrap">
            <div className="section-polaroid section-polaroid-inset" style={{ transform: 'rotate(2deg)' }}>
              <div className="polaroid-img-wrap">
                <img
                  src="/photos/this.png"
                  alt="Portrait"
                  className="polaroid-img"
                  draggable={false}
                />
              </div>
              <span className="polaroid-caption">Vancouver, BC</span>
            </div>
          </div>
        </div>

        {/* Corner decoration */}
        <span className="section-corner-note">
          &mdash; last updated April 2026
        </span>
      </div>
    </div>
  )
}

export { ABOUT_W, ABOUT_H }
