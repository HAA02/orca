import { describe, expect, it } from 'vitest'
import { isTerminalGridJitter } from './terminal-grid-jitter'

describe('isTerminalGridJitter', () => {
  it('treats a single column or row move as jitter', () => {
    expect(isTerminalGridJitter({ cols: 80, rows: 24 }, { cols: 79, rows: 24 })).toBe(true)
    expect(isTerminalGridJitter({ cols: 80, rows: 24 }, { cols: 80, rows: 25 })).toBe(true)
    expect(isTerminalGridJitter({ cols: 80, rows: 24 }, { cols: 81, rows: 25 })).toBe(true)
  })

  it('does not call an unchanged or larger grid jitter', () => {
    expect(isTerminalGridJitter({ cols: 80, rows: 24 }, { cols: 80, rows: 24 })).toBe(false)
    expect(isTerminalGridJitter({ cols: 80, rows: 24 }, { cols: 78, rows: 24 })).toBe(false)
    expect(isTerminalGridJitter({ cols: 80, rows: 24 }, { cols: 80, rows: 27 })).toBe(false)
  })
})
