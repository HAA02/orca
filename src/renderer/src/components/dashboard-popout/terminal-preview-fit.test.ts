// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Terminal } from '@xterm/xterm'
import { createTerminalPreviewFit } from './terminal-preview-fit'

function stubSize(element: HTMLElement, width: number, height: number): void {
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: width })
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: height })
  Object.defineProperty(element, 'offsetWidth', { configurable: true, value: width })
  Object.defineProperty(element, 'offsetHeight', { configurable: true, value: height })
}

function mountPreview(args: {
  boxWidth: number
  boxHeight: number
  screenWidth: number
  screenHeight: number
}): { container: HTMLDivElement; schedule: () => void; dispose: () => void } {
  const box = document.createElement('div')
  const container = document.createElement('div')
  const screen = document.createElement('div')
  screen.className = 'xterm-screen'
  container.append(screen)
  box.append(container)
  document.body.append(box)
  stubSize(box, args.boxWidth, args.boxHeight)
  stubSize(screen, args.screenWidth, args.screenHeight)
  const terminal = { rows: 24 } as Terminal
  const fit = createTerminalPreviewFit(container, () => terminal)
  return { container, schedule: fit.schedule, dispose: fit.dispose }
}

describe('createTerminalPreviewFit', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.unstubAllGlobals()
  })

  it('scales by the tighter axis so wrapped line starts stay on-screen', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    const { container, schedule, dispose } = mountPreview({
      boxWidth: 400,
      boxHeight: 200,
      screenWidth: 800,
      screenHeight: 800
    })
    schedule()
    expect(container.style.transformOrigin).toBe('top left')
    expect(container.style.transform).toBe('scale(0.25)')
    expect(container.parentElement?.style.alignItems).toBe('flex-start')
    dispose()
  })

  it('does not upscale a terminal that already fits', async () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    const { container, schedule, dispose } = mountPreview({
      boxWidth: 800,
      boxHeight: 600,
      screenWidth: 400,
      screenHeight: 300
    })
    schedule()
    expect(container.style.transform).toBe('')
    dispose()
  })
})
