import { SECTION_PHOTOS } from '../entities/sections'
import { SECTION_SIZES } from '../entities/sizes'
import { SectionPaperclip } from './SectionPaperclip'

const { w: GALLERY_W, h: GALLERY_H } = SECTION_SIZES['photo-gallery']

export function SectionPhotoGallery() {
  return (
    <div className="section-wrap" style={{ width: GALLERY_W, height: GALLERY_H }}>
      <SectionPaperclip />

      <div className="section-block" style={{ width: '100%', height: '100%' }}>
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
              key={`${photo.src}-${i}`}
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
    </div>
  )
}

export { GALLERY_W, GALLERY_H }
