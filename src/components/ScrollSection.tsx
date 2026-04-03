import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

type Props = {
  children: React.ReactNode
  className?: string
  fadeIn?: boolean
  fadeOut?: boolean
}

export function ScrollSection({ children, className, fadeIn = true, fadeOut = true }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // With 120vh wrapper + 100vh viewport = 220vh tracked range.
  // For section at document top: progress ≈ 0.45 at scrollY=0.
  // Content sticks for ~20vh of scroll before unsticking.
  //
  // fadeOut starts at 0.47 → ~3vh of scroll before fading begins (immediate feel)
  // fadeOut ends at 0.62 → fully faded by ~36vh of scroll
  // fadeIn starts at 0.08 → begins as section wrapper enters viewport
  // fadeIn ends at 0.23 → fully visible well before content sticks
  const inStart = fadeIn ? 0.08 : 0
  const inEnd = fadeIn ? 0.23 : 0
  const outStart = fadeOut ? 0.47 : 1
  const outEnd = fadeOut ? 0.62 : 1

  const opacity = useTransform(
    scrollYProgress,
    [inStart, inEnd, outStart, outEnd],
    [fadeIn ? 0 : 1, 1, 1, fadeOut ? 0 : 1],
  )

  return (
    <div ref={ref} className={`scroll-section ${className || ''}`}>
      <motion.div className="scroll-section-sticky" style={{ opacity }}>
        {children}
      </motion.div>
    </div>
  )
}
