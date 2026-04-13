import { SECTION_PHOTOS } from '../entities/sections'

const GALLERY_W = 1300
const GALLERY_H = 1440

export function SectionPhotoGallery() {
  return (
    <div className="section-block" style={{ width: GALLERY_W, height: GALLERY_H }}>
      {/* Notebook ruled lines */}
      <div className="section-ruled-bg" />

      {/* Header */}
      <div className="section-header">
        <span className="section-title">Photos</span>
        <span className="section-subtitle">// headshots, 2025</span>
      </div>

      {/* Photo grid */}
      <div className="section-photo-grid">
        {SECTION_PHOTOS.map((photo, i) => (
          <div
            key={photo.src}
            className="section-polaroid"
            style={{
              transform: `rotate(${photo.rotate}deg)`,
              animationDelay: `${i * 0.15}s`,
            }}
          >
            <div className="polaroid-img-wrap">
              <img
                src={photo.src}
                alt={photo.caption}
                className="polaroid-img"
                draggable={false}
              />
            </div>
            <span className="polaroid-caption">{photo.caption}</span>
          </div>
        ))}
      </div>

      {/* Corner doodle */}
      <span className="section-corner-note">
        &mdash; shot on Sony a6000
      </span>
    </div>
  )
}

export { GALLERY_W, GALLERY_H }
