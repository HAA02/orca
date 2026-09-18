export type TerminalGridSize = {
  cols: number
  rows: number
}

/** A FitAddon measurement often wobbles by one cell when a scrollbar gutter or
 *  fractional pixel appears. Treating that as a real layout change resizes the
 *  shared PTY, which SIGWINCHes the TUI and, across two devices, oscillates:
 *  each side's reflow re-triggers the other's fit. Both counts must move by at
 *  most one for it to be jitter. */
export function isTerminalGridJitter(current: TerminalGridSize, next: TerminalGridSize): boolean {
  const dCols = Math.abs(next.cols - current.cols)
  const dRows = Math.abs(next.rows - current.rows)
  return (dCols > 0 || dRows > 0) && dCols <= 1 && dRows <= 1
}
