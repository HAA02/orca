import { describe, expect, it } from 'vitest'
import { shouldClaimRemoteDesktopViewport } from './remote-desktop-viewport-claim'

describe('shouldClaimRemoteDesktopViewport', () => {
  it('requires a second, changed measurement from a focused visible pane', () => {
    const current = { cols: 100, rows: 30 }
    expect(
      shouldClaimRemoteDesktopViewport({
        holdMode: 'remote-desktop-fit',
        prior: null,
        current,
        paneGeometryChanged: false,
        paneVisible: true,
        documentVisible: true,
        documentFocused: true
      })
    ).toBe(false)
    expect(
      shouldClaimRemoteDesktopViewport({
        holdMode: 'remote-desktop-fit',
        prior: { cols: 90, rows: 30 },
        current,
        paneGeometryChanged: false,
        paneVisible: true,
        documentVisible: true,
        documentFocused: true
      })
    ).toBe(true)
  })

  it.each([
    { paneVisible: false, documentVisible: true, documentFocused: true },
    { paneVisible: true, documentVisible: false, documentFocused: true },
    { paneVisible: true, documentVisible: true, documentFocused: false }
  ])('rejects passive background geometry: %o', (visibility) => {
    expect(
      shouldClaimRemoteDesktopViewport({
        holdMode: 'remote-desktop-fit',
        prior: { cols: 90, rows: 30 },
        current: { cols: 100, rows: 30 },
        paneGeometryChanged: false,
        ...visibility
      })
    ).toBe(false)
  })

  it('accepts the first focused measurement after the observed pane box changed', () => {
    expect(
      shouldClaimRemoteDesktopViewport({
        holdMode: 'remote-desktop-fit',
        prior: null,
        current: { cols: 70, rows: 30 },
        paneGeometryChanged: true,
        paneVisible: true,
        documentVisible: true,
        documentFocused: true
      })
    ).toBe(true)
  })

  it('ignores a ±1 cell FitAddon wobble while the pane box is unchanged', () => {
    const base = {
      holdMode: 'remote-desktop-fit' as const,
      paneGeometryChanged: false,
      paneVisible: true,
      documentVisible: true,
      documentFocused: true
    }
    expect(
      shouldClaimRemoteDesktopViewport({
        ...base,
        prior: { cols: 100, rows: 30 },
        current: { cols: 101, rows: 30 }
      })
    ).toBe(false)
    expect(
      shouldClaimRemoteDesktopViewport({
        ...base,
        prior: { cols: 100, rows: 30 },
        current: { cols: 100, rows: 31 }
      })
    ).toBe(false)
    expect(
      shouldClaimRemoteDesktopViewport({
        ...base,
        prior: { cols: 100, rows: 30 },
        current: { cols: 100, rows: 30 }
      })
    ).toBe(false)
  })

  it('still claims a jitter-sized change when the pane box actually moved', () => {
    expect(
      shouldClaimRemoteDesktopViewport({
        holdMode: 'remote-desktop-fit',
        prior: { cols: 100, rows: 30 },
        current: { cols: 101, rows: 30 },
        paneGeometryChanged: true,
        paneVisible: true,
        documentVisible: true,
        documentFocused: true
      })
    ).toBe(true)
  })
})
