import type { ManagedPane, ManagedPaneInternal } from './pane-manager-types'
import { isFitAddonCellJitter, paneLayoutBoxUnchanged } from './foreground-grid-drift'
import { cancelPendingSafeFitContinuations, safeFitAndThen } from './pane-tree-ops'

type ProposedDimensions = {
  cols: number
  rows: number
}

type StableFitPane = ManagedPane &
  Partial<Pick<ManagedPaneInternal, 'xtermContainer' | 'pendingObservedFitRafId'>>

const MAX_STABILITY_FRAMES = 8
const pendingStableFitRafIds = new WeakMap<StableFitPane, number>()
const stableFitCallbacks = new WeakMap<StableFitPane, Set<() => void>>()
const lastOuterLayoutByPane = new WeakMap<StableFitPane, { width: number; height: number }>()

function getPendingObservedFitRafId(pane: StableFitPane): number | null {
  return pane.pendingObservedFitRafId ?? pendingStableFitRafIds.get(pane) ?? null
}

function setPendingObservedFitRafId(pane: StableFitPane, id: number | null): void {
  if ('pendingObservedFitRafId' in pane) {
    pane.pendingObservedFitRafId = id
    return
  }
  if (id === null) {
    pendingStableFitRafIds.delete(pane)
  } else {
    pendingStableFitRafIds.set(pane, id)
  }
}

function getFitElement(pane: StableFitPane): HTMLElement {
  return pane.xtermContainer ?? pane.container
}

function getProposedDimensions(pane: StableFitPane): ProposedDimensions | null {
  try {
    return pane.fitAddon.proposeDimensions() ?? null
  } catch {
    return null
  }
}

function dimensionsEqual(a: ProposedDimensions | null, b: ProposedDimensions | null): boolean {
  return a?.cols === b?.cols && a?.rows === b?.rows
}

function terminalDimensionsEqual(pane: StableFitPane, dims: ProposedDimensions): boolean {
  return pane.terminal.cols === dims.cols && pane.terminal.rows === dims.rows
}

function hasVisibleFitGeometry(pane: StableFitPane): boolean {
  const rect = getFitElement(pane).getBoundingClientRect?.()
  return !rect || (rect.width > 0 && rect.height > 0)
}

function readOuterLayout(pane: StableFitPane): { width: number; height: number } | null {
  const rect = pane.container?.getBoundingClientRect?.()
  if (!rect) {
    return null
  }
  return { width: rect.width, height: rect.height }
}

function outerPaneLayoutChanged(pane: StableFitPane): boolean {
  return !paneLayoutBoxUnchanged(lastOuterLayoutByPane.get(pane), readOuterLayout(pane))
}

function rememberOuterLayout(pane: StableFitPane): void {
  const current = readOuterLayout(pane)
  if (current) {
    lastOuterLayoutByPane.set(pane, current)
  }
}

function abortStableFit(pane: StableFitPane): void {
  setPendingObservedFitRafId(pane, null)
  stableFitCallbacks.delete(pane)
}

function addStableFitCallback(pane: StableFitPane, callback: (() => void) | undefined): void {
  if (!callback) {
    return
  }
  const callbacks = stableFitCallbacks.get(pane) ?? new Set()
  callbacks.add(callback)
  stableFitCallbacks.set(pane, callbacks)
}

function flushStableFitCallbacks(pane: StableFitPane): void {
  const callbacks = stableFitCallbacks.get(pane)
  if (!callbacks) {
    return
  }
  stableFitCallbacks.delete(pane)
  for (const callback of callbacks) {
    callback()
  }
}

function finishStableFit(pane: StableFitPane): void {
  setPendingObservedFitRafId(pane, null)
  // Why: an equal grid still proves a restored pane is measurable, so it must
  // release reattach continuations that were parked while the tab was hidden.
  safeFitAndThen(pane, 'stable-pane-fit', () => flushStableFitCallbacks(pane))
}

export function requestStablePaneFit(pane: StableFitPane, onSettled?: () => void): void {
  addStableFitCallback(pane, onSettled)
  if (getPendingObservedFitRafId(pane) !== null) {
    return
  }
  if (!hasVisibleFitGeometry(pane)) {
    stableFitCallbacks.delete(pane)
    return
  }
  // Why: keep xterm fit work off the divider pointermove hot path and let
  // the browser coalesce drag-driven size changes the same way Superset does.
  //
  // A FitAddon ±1 cell (scrollbar gutter or extra row) can sit still for the
  // whole AI stream. Adopting it SIGWINCHes the TUI into wrap / a CLI that
  // grows downward. Ignore that jitter unless the outer pane box actually moved.
  const paneResized = outerPaneLayoutChanged(pane)
  rememberOuterLayout(pane)
  let previous = getProposedDimensions(pane)
  let frameCount = 0
  const waitForStableGrid = (): void => {
    setPendingObservedFitRafId(
      pane,
      requestAnimationFrame(() => {
        if (!hasVisibleFitGeometry(pane)) {
          abortStableFit(pane)
          return
        }
        const next = getProposedDimensions(pane)
        frameCount += 1

        if (!next) {
          finishStableFit(pane)
          return
        }

        if (terminalDimensionsEqual(pane, next)) {
          finishStableFit(pane)
          return
        }

        if (
          !paneResized &&
          isFitAddonCellJitter({ cols: pane.terminal.cols, rows: pane.terminal.rows }, next)
        ) {
          abortStableFit(pane)
          return
        }

        if (dimensionsEqual(previous, next)) {
          finishStableFit(pane)
          return
        }

        previous = next
        if (frameCount >= MAX_STABILITY_FRAMES) {
          abortStableFit(pane)
          return
        }

        waitForStableGrid()
      })
    )
  }
  waitForStableGrid()
}

export function attachPaneFitResizeObserver(pane: ManagedPaneInternal): void {
  detachPaneFitResizeObserver(pane)

  if (typeof ResizeObserver === 'undefined') {
    return
  }

  const observer = new ResizeObserver(() => {
    requestStablePaneFit(pane)
  })

  // Why: xtermContainer shrinks when a scrollbar appears; the outer pane does not.
  observer.observe(pane.container)
  pane.fitResizeObserver = observer
}

export function detachPaneFitResizeObserver(pane: ManagedPaneInternal): void {
  pane.fitResizeObserver?.disconnect()
  pane.fitResizeObserver = null

  const pendingObservedFitRafId = getPendingObservedFitRafId(pane)
  if (pendingObservedFitRafId !== null) {
    cancelAnimationFrame(pendingObservedFitRafId)
    setPendingObservedFitRafId(pane, null)
  }
  stableFitCallbacks.delete(pane)
  cancelPendingSafeFitContinuations(pane)
}
