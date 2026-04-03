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

  const inStart = fadeIn ? 0.1 : 0
  const inEnd = fadeIn ? 0.3 : 0
  const outStart = fadeOut ? 0.7 : 1
  const outEnd = fadeOut ? 0.9 : 1

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
