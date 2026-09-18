import type { Terminal } from '@xterm/xterm'

/**
 * Scales a preview terminal (created at the pane's true cols/rows) so the
 * whole buffer fits the tile. Width-only scale plus bottom-crop hid the start
 * of wrapped lines, so typing looked like it began mid-token.
 */
export function createTerminalPreviewFit(
  container: HTMLElement,
  getTerminal: () => Terminal | null
): { schedule: () => void; dispose: () => void } {
  const fitToBox = (): void => {
    const terminal = getTerminal()
    const screen = container.querySelector<HTMLElement>('.xterm-screen')
    const box = container.parentElement
    if (!screen || !box || !terminal) {
      return
    }
    const scale = Math.min(
      1,
      box.clientWidth / Math.max(1, screen.offsetWidth),
      box.clientHeight / Math.max(1, screen.offsetHeight)
    )
    container.style.transformOrigin = 'top left'
    container.style.transform = scale < 1 ? `scale(${scale})` : ''
    box.style.alignItems = 'flex-start'
  }

  let fitScheduled = false
  const schedule = (): void => {
    if (fitScheduled) {
      return
    }
    fitScheduled = true
    requestAnimationFrame(() => {
      fitScheduled = false
      fitToBox()
    })
  }

  const box = container.parentElement
  const resizeObserver =
    typeof ResizeObserver === 'function' && box
      ? new ResizeObserver(() => {
          schedule()
        })
      : null
  resizeObserver?.observe(box)

  return {
    schedule,
    dispose: (): void => {
      resizeObserver?.disconnect()
    }
  }
}
