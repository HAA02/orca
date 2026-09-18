import { isTerminalGridJitter } from '../../../../shared/terminal-grid-jitter'
import type { FitHoldMode } from '@/lib/pane-manager/mobile-fit-overrides'

type TerminalGrid = { cols: number; rows: number }

export function shouldClaimRemoteDesktopViewport(args: {
  holdMode: FitHoldMode
  prior: TerminalGrid | null
  current: TerminalGrid
  paneGeometryChanged: boolean
  paneVisible: boolean
  documentVisible: boolean
  documentFocused: boolean
}): boolean {
  // Why: a parked remote-desktop pane re-measures every observer tick. A ±1
  // cell FitAddon/scrollbar wobble is not user intent; claiming it resizes the
  // shared PTY, the owner reflows, and the two devices trade SIGWINCH forever.
  // Only a real pane-box change or a drift larger than one cell is a claim.
  const gridDrifted = Boolean(
    args.prior &&
    (args.prior.cols !== args.current.cols || args.prior.rows !== args.current.rows) &&
    !isTerminalGridJitter(args.prior, args.current)
  )
  return Boolean(
    args.holdMode === 'remote-desktop-fit' &&
    (args.paneGeometryChanged || gridDrifted) &&
    args.paneVisible &&
    args.documentVisible &&
    args.documentFocused
  )
}
