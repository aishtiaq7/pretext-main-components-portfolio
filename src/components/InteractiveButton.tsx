import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { EntityDef } from '../types'
import { audio } from '../audio/AudioController'
import { isMultiTouchActive } from '../store/gestures'

// ═══════════════════════════════════════════════════════════
// InteractiveButton — clickable SVG/raster entity with a small
// state machine: idle → hover → press → postClick (one-shot).
//
// For .svg sources, the SVG is fetched and inlined so we can set
// pointer-events: visiblePainted on it — clicks only register on
// actual painted stroke pixels, not the rectangular bounding box.
// For non-SVG (PNG etc.) we fall back to <img> with rectangular
// hit testing.
//
// Visual feedback uses framer-motion transforms by default; optional
// asset swaps (hoverSrc/pressSrc/postClickSrc) take precedence when
// provided. Click fires `onAction(actionKey)`, resolved by App.tsx's
// buttonActions map.
// ═══════════════════════════════════════════════════════════

const DEFAULT_HOVER_FILTER = 'drop-shadow(0 8px 14px rgba(0,0,0,0.35))'

type Props = {
  entity: EntityDef
  x: number                          // canvas %
  y: number                          // canvas %
  onAction: (actionKey: string) => void
}

type Phase = 'idle' | 'hover' | 'press' | 'postClick'

// ── SVG cache + loader ─────────────────────────────────────
// Fetched SVGs in /public are author-controlled, so injecting them
// via dangerouslySetInnerHTML is acceptable here.
type SvgPayload = { viewBox: string; inner: string }
const svgCache = new Map<string, SvgPayload>()
const svgPending = new Map<string, Promise<void>>()

function loadSvg(src: string): Promise<void> {
  if (svgCache.has(src)) return Promise.resolve()
  const existing = svgPending.get(src)
  if (existing) return existing
  const p = fetch(src)
    .then((r) => r.text())
    .then((text) => {
      const vb = /viewBox="([^"]+)"/.exec(text)?.[1] ?? '0 0 100 100'
      const inner = /<svg\b[^>]*>([\s\S]*)<\/svg>/i.exec(text)?.[1] ?? ''
      svgCache.set(src, { viewBox: vb, inner })
    })
    .catch(() => { /* keep silent — caller renders a layout placeholder */ })
    .finally(() => { svgPending.delete(src) })
  svgPending.set(src, p)
  return p
}

function useSvg(src: string | undefined): SvgPayload | undefined {
  const isSvg = !!src && src.endsWith('.svg')
  // Force-rerender counter — bumped after async fetch completes so the
  // render below picks up the freshly-cached payload.
  const [, bump] = useState(0)
  useEffect(() => {
    if (!isSvg || !src) return
    if (svgCache.has(src)) return
    let cancelled = false
    loadSvg(src).then(() => {
      if (!cancelled) bump((n) => n + 1)
    })
    return () => { cancelled = true }
  }, [src, isSvg])
  return isSvg && src ? svgCache.get(src) : undefined
}

export function InteractiveButton({ entity, x, y, onAction }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  // One-shot lock — once true, button stays in postClick state forever.
  const clickedRef = useRef(false)
  // Track the audio src we primed last hover so we don't spam priming.
  const lastHoverPrimedRef = useRef<string | null>(null)

  const hoverScale = entity.hoverScale ?? 1.05
  const pressScale = entity.pressScale ?? 0.95

  // Pick the visual src for the current phase. Asset swap if provided,
  // otherwise fall back to idle imgSrc (transform handles the feedback).
  const currentSrc = useMemo(() => (
    phase === 'postClick' ? (entity.postClickSrc ?? entity.imgSrc) :
    phase === 'press'     ? (entity.pressSrc     ?? entity.imgSrc) :
    phase === 'hover'     ? (entity.hoverSrc     ?? entity.imgSrc) :
                            entity.imgSrc
  ), [phase, entity.imgSrc, entity.hoverSrc, entity.pressSrc, entity.postClickSrc])

  const isSvgSrc = !!currentSrc && currentSrc.endsWith('.svg')
  const svgPayload = useSvg(currentSrc)

  const currentScale =
    phase === 'press' ? pressScale :
    phase === 'hover' ? hoverScale :
                        1

  const currentFilter = phase === 'hover'
    ? (entity.hoverFilter ?? DEFAULT_HOVER_FILTER)
    : 'none'

  const handlePointerEnter = useCallback(() => {
    if (clickedRef.current) return
    setPhase('hover')
    if (entity.hoverSound && lastHoverPrimedRef.current !== entity.hoverSound) {
      lastHoverPrimedRef.current = entity.hoverSound
      audio.prime(entity.hoverSound)
    }
    if (entity.hoverSound) audio.play(entity.hoverSound)
  }, [entity.hoverSound])

  const handlePointerLeave = useCallback(() => {
    if (clickedRef.current) return
    setPhase('idle')
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (clickedRef.current) return
    if (isMultiTouchActive()) return
    e.stopPropagation()
    setPhase('press')
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (clickedRef.current) return
    if (phase !== 'press') return
    e.stopPropagation()
    // Prime + play click sound inside the gesture stack (mobile audio unlock).
    if (entity.clickSound) {
      audio.prime(entity.clickSound)
      audio.play(entity.clickSound)
    }
    clickedRef.current = true
    setPhase('postClick')
    if (entity.onClickAction) onAction(entity.onClickAction)
  }, [phase, entity.clickSound, entity.onClickAction, onAction])

  const handlePointerCancel = useCallback(() => {
    if (clickedRef.current) return
    setPhase('idle')
  }, [])

  const cursorStyle = phase === 'postClick' ? 'default' : 'pointer'

  // Bundle pointer handlers — attached to the SVG (stroke-only hit testing)
  // or the <img> wrapper depending on source type.
  const pointerHandlers = {
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  }

  return (
    <motion.div
      className={`entity entity-button ${entity.className ?? ''}`}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        // For SVG: wrapper does NOT catch events — only the painted strokes
        // inside the inline SVG do (via pointer-events: visiblePainted).
        // For raster (PNG/JPG): the wrapper catches events on its full
        // rectangle, same as a normal button.
        pointerEvents: isSvgSrc ? 'none' : 'auto',
        touchAction: 'none',
        willChange: 'transform',
        opacity: entity.opacity,
        ...entity.style,
      }}
      initial={{ scale: 1, rotate: entity.rotate ?? 0 }}
      animate={{
        scale: currentScale,
        rotate: entity.rotate ?? 0,
        filter: currentFilter,
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      {...(!isSvgSrc ? pointerHandlers : {})}
    >
      {isSvgSrc ? (
        svgPayload ? (
          <svg
            viewBox={svgPayload.viewBox}
            width={entity.imgW}
            height={entity.imgH}
            style={{
              display: 'block',
              // visiblePainted: each <path> inside (default pointer-events)
              // only hits its painted area. The wrapping <svg> itself only
              // catches events on its own painted background (which is none,
              // so events only fire on the painted children). Net effect:
              // clicks register exclusively on stroke pixels.
              pointerEvents: 'visiblePainted',
              cursor: cursorStyle,
              userSelect: 'none',
            }}
            dangerouslySetInnerHTML={{ __html: svgPayload.inner }}
            {...pointerHandlers}
          />
        ) : (
          // Layout placeholder until the SVG fetch completes
          <div style={{ width: entity.imgW, height: entity.imgH }} />
        )
      ) : (
        <img
          src={currentSrc}
          width={entity.imgW}
          height={entity.imgH}
          draggable={false}
          alt=""
          style={{
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
            cursor: cursorStyle,
          }}
        />
      )}
    </motion.div>
  )
}
