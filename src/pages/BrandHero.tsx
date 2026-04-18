import { BRAND_NAME } from '../entities'

// Brand page content — oversized handwritten hero used by the `brand-page`
// entry in `PAGES`. Styling is self-contained so the data file stays terse.
export function BrandHero() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
      <span style={{
        fontFamily: '"Permanent Marker", cursive',
        fontSize: '7.5rem',
        fontWeight: 400,
        color: '#3a3530',
        opacity: 0.92,
        transform: 'rotate(-2deg)',
        whiteSpace: 'nowrap',
      }}>
        {BRAND_NAME}
      </span>
    </div>
  )
}
