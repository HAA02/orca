import {
  isTerminalGridJitter,
  type TerminalGridSize
} from '../../../../shared/terminal-grid-jitter'

export type { TerminalGridSize }

export type PaneLayoutBox = {
  width: number
  height: number
}

/** FitAddon jitters by at most one cell when a scrollbar or fractional pixel
 *  appears. Adopting that SIGWINCHes the TUI: wrap on −1 col, extra blank
 *  lines on +1 row, so the CLI looks like it grows downward from open. */
export const isFitAddonCellJitter = isTerminalGridJitter

export function paneLayoutBoxUnchanged(
  previous: PaneLayoutBox | null | undefined,
  current: PaneLayoutBox | null | undefined
): boolean {
  if (!previous || !current) {
    return false
  }
  return (
    Math.abs(previous.width - current.width) < 2 && Math.abs(previous.height - current.height) < 2
  )
}

/** Two matching proposals in a row, different from the live grid, count as drift.
 *  ±1-cell FitAddon jitter never confirms, even when it is stable for many frames. */
export function confirmForegroundGridDrift(
  pending: TerminalGridSize | null,
  current: TerminalGridSize,
  proposed: TerminalGridSize | null
): { apply: boolean; pending: TerminalGridSize | null } {
  if (!proposed || (current.cols === proposed.cols && current.rows === proposed.rows)) {
    return { apply: false, pending: null }
  }
  if (isFitAddonCellJitter(current, proposed)) {
    return { apply: false, pending: null }
  }
  if (pending && pending.cols === proposed.cols && pending.rows === proposed.rows) {
    return { apply: true, pending: null }
  }
  return { apply: false, pending: proposed }
}
