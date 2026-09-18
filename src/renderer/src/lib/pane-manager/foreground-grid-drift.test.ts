import { describe, expect, it } from 'vitest'
import {
  confirmForegroundGridDrift,
  isFitAddonCellJitter,
  paneLayoutBoxUnchanged
} from './foreground-grid-drift'

describe('confirmForegroundGridDrift', () => {
  it('ignores a matching live grid', () => {
    expect(
      confirmForegroundGridDrift(null, { cols: 80, rows: 24 }, { cols: 80, rows: 24 })
    ).toEqual({ apply: false, pending: null })
  })

  it('requires two identical drifted proposals', () => {
    const first = confirmForegroundGridDrift(null, { cols: 80, rows: 24 }, { cols: 84, rows: 24 })
    expect(first).toEqual({ apply: false, pending: { cols: 84, rows: 24 } })
    expect(
      confirmForegroundGridDrift(first.pending, { cols: 80, rows: 24 }, { cols: 84, rows: 24 })
    ).toEqual({ apply: true, pending: null })
  })

  it('does not apply a 1-col oscillation', () => {
    let pending = confirmForegroundGridDrift(
      null,
      { cols: 80, rows: 24 },
      { cols: 81, rows: 24 }
    ).pending
    pending = confirmForegroundGridDrift(
      pending,
      { cols: 80, rows: 24 },
      { cols: 80, rows: 24 }
    ).pending
    const again = confirmForegroundGridDrift(
      pending,
      { cols: 80, rows: 24 },
      { cols: 81, rows: 24 }
    )
    expect(again.apply).toBe(false)
  })

  it('does not apply a stable 1-col scrollbar gutter', () => {
    const first = confirmForegroundGridDrift(null, { cols: 80, rows: 24 }, { cols: 79, rows: 24 })
    expect(first).toEqual({ apply: false, pending: null })
    expect(
      confirmForegroundGridDrift(first.pending, { cols: 80, rows: 24 }, { cols: 79, rows: 24 })
    ).toEqual({ apply: false, pending: null })
  })

  it('does not apply a stable +1 row (CLI growing downward)', () => {
    expect(
      confirmForegroundGridDrift(null, { cols: 80, rows: 24 }, { cols: 80, rows: 25 })
    ).toEqual({ apply: false, pending: null })
    expect(
      confirmForegroundGridDrift(null, { cols: 80, rows: 24 }, { cols: 80, rows: 25 })
    ).toEqual({ apply: false, pending: null })
  })
})

describe('isFitAddonCellJitter', () => {
  it('is true for a single column or row', () => {
    expect(isFitAddonCellJitter({ cols: 80, rows: 24 }, { cols: 79, rows: 24 })).toBe(true)
    expect(isFitAddonCellJitter({ cols: 80, rows: 24 }, { cols: 80, rows: 25 })).toBe(true)
    expect(isFitAddonCellJitter({ cols: 80, rows: 24 }, { cols: 81, rows: 25 })).toBe(true)
    expect(isFitAddonCellJitter({ cols: 80, rows: 24 }, { cols: 78, rows: 24 })).toBe(false)
    expect(isFitAddonCellJitter({ cols: 80, rows: 24 }, { cols: 80, rows: 27 })).toBe(false)
    expect(isFitAddonCellJitter({ cols: 80, rows: 24 }, { cols: 80, rows: 24 })).toBe(false)
  })
})

describe('paneLayoutBoxUnchanged', () => {
  it('requires both boxes', () => {
    expect(paneLayoutBoxUnchanged(null, { width: 800, height: 600 })).toBe(false)
  })

  it('tolerates sub-pixel noise', () => {
    expect(
      paneLayoutBoxUnchanged({ width: 800, height: 600 }, { width: 800.4, height: 600.2 })
    ).toBe(true)
    expect(paneLayoutBoxUnchanged({ width: 800, height: 600 }, { width: 820, height: 600 })).toBe(
      false
    )
  })
})
