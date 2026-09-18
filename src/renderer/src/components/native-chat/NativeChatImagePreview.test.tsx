// @vitest-environment happy-dom
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadLocalImageAbsolutePath: vi.fn(),
  resolveNativeChatAttachmentOwner: vi.fn()
}))

vi.mock('@/store', () => {
  const state = {}
  const useAppStore = (selector: (value: typeof state) => unknown) => selector(state)
  useAppStore.getState = () => state
  return { useAppStore }
})

vi.mock('../editor/useLocalImageSrc', () => ({
  loadLocalImageAbsolutePath: mocks.loadLocalImageAbsolutePath
}))

vi.mock('./native-chat-attachment-upload', () => ({
  resolveNativeChatAttachmentOwner: mocks.resolveNativeChatAttachmentOwner
}))

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string) => fallback
}))

import { NativeChatImagePreview } from './NativeChatImagePreview'

describe('NativeChatImagePreview', () => {
  beforeEach(() => {
    mocks.resolveNativeChatAttachmentOwner.mockReturnValue({ kind: 'local' })
    mocks.loadLocalImageAbsolutePath.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders a loaded local image thumbnail', async () => {
    mocks.loadLocalImageAbsolutePath.mockResolvedValue('blob:preview')
    render(
      <NativeChatImagePreview
        terminalTabId="tab-1"
        path="/tmp/orca-paste-1-2.png"
        size="composer"
      />
    )
    await waitFor(() => {
      expect(document.querySelector('img')?.getAttribute('src')).toBe('blob:preview')
    })
    expect(document.querySelector('img')?.getAttribute('alt')).toBe('Pasted image')
  })

  it('falls back to a label chip when the local image cannot load', async () => {
    mocks.loadLocalImageAbsolutePath.mockResolvedValue(null)
    render(<NativeChatImagePreview terminalTabId="tab-1" path="/tmp/shot.png" size="message" />)
    await waitFor(() => {
      expect(document.querySelector('img')).toBeNull()
    })
    expect(document.body.textContent).toContain('shot.png')
  })

  it('uses a remote URL without reading the filesystem', async () => {
    render(
      <NativeChatImagePreview
        terminalTabId="tab-1"
        url="https://example.test/a.png"
        alt="remote"
        size="message"
      />
    )
    await act(async () => undefined)
    expect(mocks.loadLocalImageAbsolutePath).not.toHaveBeenCalled()
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://example.test/a.png')
  })

  it('reads SSH images through the connection id', async () => {
    mocks.resolveNativeChatAttachmentOwner.mockReturnValue({
      kind: 'ssh',
      connectionId: 'conn-1',
      worktreePath: '/remote'
    })
    mocks.loadLocalImageAbsolutePath.mockResolvedValue('blob:ssh')
    render(<NativeChatImagePreview terminalTabId="tab-1" path="/tmp/remote.png" size="composer" />)
    await waitFor(() => {
      expect(mocks.loadLocalImageAbsolutePath).toHaveBeenCalledWith('/tmp/remote.png', 'conn-1')
    })
  })
})
