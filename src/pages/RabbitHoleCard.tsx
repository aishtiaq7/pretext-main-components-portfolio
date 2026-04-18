import { ALICE_QUOTE } from '../entities'

// Rabbit-hole card content — "Down the Rabbit Hole" heading + Alice quote.
// Lives inside the draggable `text-page` entry.
export function RabbitHoleCard() {
  return (
    <div style={{ width: '100%', height: '100%', padding: 24 }}>
      <h2 style={{
        font: '700 1.8rem "Indie Flower", cursive',
        color: '#1a1714',
        marginBottom: 12,
        textShadow: '0 1px 0 rgba(232, 228, 217, 0.8)',
      }}>Down the Rabbit Hole</h2>
      <p style={{
        font: '1.15rem "Kalam", cursive',
        lineHeight: 1.55,
        color: '#2a2520',
        textShadow: '0 1px 0 rgba(232, 228, 217, 0.8)',
      }}>{ALICE_QUOTE}</p>
    </div>
  )
}
