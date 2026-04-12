import { useEffect, useRef } from 'react'

function drawClock(ctx: CanvasRenderingContext2D, r: number) {
  const now = new Date()
  const hours = now.getHours() % 12
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  const millis = now.getMilliseconds()
  const smooth = seconds + millis / 1000

  ctx.clearRect(0, 0, r * 2, r * 2)
  ctx.save()
  ctx.translate(r, r)

  // Face
  ctx.beginPath()
  ctx.arc(0, 0, r - 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(232, 228, 217, 0.95)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(200, 120, 120, 0.5)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Hour marks
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6
    const isQ = i % 3 === 0
    ctx.beginPath()
    ctx.moveTo(
      Math.cos(angle) * (r - (isQ ? 22 : 16)),
      Math.sin(angle) * (r - (isQ ? 22 : 16)),
    )
    ctx.lineTo(Math.cos(angle) * (r - 8), Math.sin(angle) * (r - 8))
    ctx.strokeStyle = isQ ? '#5a3a3a' : '#8a7a7a'
    ctx.lineWidth = isQ ? 2.5 : 1.2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  // "RESPECT" label
  ctx.fillStyle = '#8a6a6a'
  ctx.font = `600 ${Math.round(r * 0.1)}px "Patrick Hand", cursive`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('RESPECT', 0, r * 0.28)

  // Hour hand
  const hAngle = ((hours + minutes / 60) * Math.PI) / 6 - Math.PI / 2
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(Math.cos(hAngle) * r * 0.45, Math.sin(hAngle) * r * 0.45)
  ctx.strokeStyle = '#3a3530'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.stroke()

  // Minute hand
  const mAngle = ((minutes + smooth / 60) * Math.PI) / 30 - Math.PI / 2
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(Math.cos(mAngle) * r * 0.65, Math.sin(mAngle) * r * 0.65)
  ctx.strokeStyle = '#3a3530'
  ctx.lineWidth = 2.5
  ctx.stroke()

  // Second hand
  const sAngle = (smooth * Math.PI) / 30 - Math.PI / 2
  ctx.beginPath()
  ctx.moveTo(
    Math.cos(sAngle + Math.PI) * r * 0.12,
    Math.sin(sAngle + Math.PI) * r * 0.12,
  )
  ctx.lineTo(Math.cos(sAngle) * r * 0.75, Math.sin(sAngle) * r * 0.75)
  ctx.strokeStyle = '#c85a5a'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // Center dot
  ctx.beginPath()
  ctx.arc(0, 0, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#c85a5a'
  ctx.fill()
  ctx.restore()
}

export function MiniClock({ size = 200 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const r = size / 2
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    function frame() {
      drawClock(ctx!, r)
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  )
}
