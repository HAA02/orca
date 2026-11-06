import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NativeChatFileLinkContext } from './native-chat-file-link'

const openHttpLinkMock = vi.hoisted(() => vi.fn())
const openDetectedFilePathMock = vi.hoisted(() => vi.fn())
const getConnectionIdMock = vi.hoisted(() => vi.fn(() => null as string | null | undefined))

vi.mock('@/lib/http-link-routing', () => ({
  openHttpLink: openHttpLinkMock
}))
vi.mock('@/lib/connection-context', () => ({
  getConnectionId: getConnectionIdMock
}))
vi.mock('@/components/terminal-pane/terminal-file-open-routing', () => ({
  openDetectedFilePath: openDetectedFilePathMock
}))

import {
  activateNativeChatMarkdownLink,
  nativeChatHttpSourceOwner
} from './native-chat-markdown-link-activation'

const context: NativeChatFileLinkContext = {
  worktreeId: 'wt-1',
  worktreePath: '/repo/worktree',
  runtimeEnvironmentId: null
}

function click(overrides: Partial<{ shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }> = {}) {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    ...overrides
  }
}

describe('activateNativeChatMarkdownLink', () => {
  beforeEach(() => {
    openHttpLinkMock.mockReset()
    openDetectedFilePathMock.mockReset()
    getConnectionIdMock.mockReset()
    getConnectionIdMock.mockReturnValue(null)
  })

  it('opens http links on a plain click', () => {
    const event = click()
    expect(
      activateNativeChatMarkdownLink(event, 'http://192.168.0.72:8092/dtdweb', context, {
        kind: 'local'
      })
    ).toBe(true)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(openDetectedFilePathMock).not.toHaveBeenCalled()
    expect(openHttpLinkMock).toHaveBeenCalledWith('http://192.168.0.72:8092/dtdweb', {
      worktreeId: 'wt-1',
      forceSystemBrowser: false,
      sourceOwner: { kind: 'local' }
    })
  })

  it('sends Shift+Ctrl clicks to the system browser on Linux', () => {
    const event = click({ shiftKey: true, ctrlKey: true })
    activateNativeChatMarkdownLink(event, 'https://example.com/docs', context, { kind: 'local' })
    expect(openHttpLinkMock).toHaveBeenCalledWith('https://example.com/docs', {
      worktreeId: 'wt-1',
      forceSystemBrowser: true,
      sourceOwner: { kind: 'local' }
    })
  })

  it('opens resolved file links in the worktree', () => {
    const event = click()
    expect(activateNativeChatMarkdownLink(event, 'src/app/Main.tsx', context)).toBe(true)
    expect(openHttpLinkMock).not.toHaveBeenCalled()
    expect(openDetectedFilePathMock).toHaveBeenCalledWith(
      '/repo/worktree/src/app/Main.tsx',
      null,
      null,
      {
        worktreeId: 'wt-1',
        worktreePath: '/repo/worktree',
        runtimeEnvironmentId: null,
        openWithSystemDefault: false
      }
    )
  })
})

describe('nativeChatHttpSourceOwner', () => {
  beforeEach(() => {
    getConnectionIdMock.mockReset()
  })

  it('keeps a runtime-owned chat off the local browser route', () => {
    expect(
      nativeChatHttpSourceOwner({
        ...context,
        runtimeEnvironmentId: 'env-1'
      })
    ).toEqual({ kind: 'runtime', runtimeEnvironmentId: 'env-1' })
    expect(getConnectionIdMock).not.toHaveBeenCalled()
  })

  it('treats a resolved local worktree as local', () => {
    getConnectionIdMock.mockReturnValue(null)
    expect(nativeChatHttpSourceOwner(context)).toEqual({ kind: 'local' })
  })
})
