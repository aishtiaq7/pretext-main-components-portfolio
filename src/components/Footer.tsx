import type { Stats } from '../types'

type Props = {
  stats: Stats
}

export const Footer = ({ stats }: Props) => (
  <footer className="stats-bar">
    <div className="stats-list" aria-label="Performance stats">
      <span className="stat-pair"><span className="stat-label">Lines</span> <span className="stat-value">{stats.lines}</span></span>
      <span className="stat-pair"><span className="stat-label">Reflow</span> <span className="stat-value">{stats.reflow}ms</span></span>
      <span className="stat-pair"><span className="stat-label">DOM reads</span> <span className="stat-value">0</span></span>
      <span className="stat-pair"><span className="stat-label">FPS</span> <span className="stat-value">{stats.fps}</span></span>
      <span className="stat-pair"><span className="stat-label">Columns</span> <span className="stat-value">{stats.cols}</span></span>
    </div>
    <nav aria-label="Credits" className="credits-nav">
      <span>Built by <a href="https://github.com/micaavigliano/the-editorial-engine-a11y" target="_blank" rel="noopener noreferrer">Mica Avigliano</a></span>
      <span className="credit-sep" aria-hidden="true"> · </span>
      <span>Text: <cite>Cien a&ntilde;os de soledad</cite> by Gabriel Garc&iacute;a M&aacute;rquez</span>
      <span className="credit-sep" aria-hidden="true"> · </span>
      <span>Powered by <a href="https://github.com/chenglou/pretext" target="_blank" rel="noopener noreferrer">pretext</a> by Cheng Lou</span>
    </nav>
  </footer>
)
