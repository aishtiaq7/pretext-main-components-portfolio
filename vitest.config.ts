import { defineConfig } from 'vitest/config'

// Ink-studio (writer) and the portfolio (reader) share the JSON contract
// in ink-studio/src/types.ts. Tests for both sides run under one Vitest.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
