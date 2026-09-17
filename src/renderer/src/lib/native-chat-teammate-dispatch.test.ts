import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParsedTeammateMention } from '../../../shared/native-chat-teammate-mention'

const mockLaunchAgentInNewTab = vi.fn()
const mockCallRuntimeRpc = vi.fn()
const mockPasteDraftWhenAgentReady = vi.fn()
const mockToastMessage = vi.fn()
const mockToastError = vi.fn()
const mockIsWebRuntimeSessionActive = vi.fn(() => false)

const store = {
  tabsByWorktree: {
    'wt-1': [{ id: 'lead-tab' }, { id: 'worker-tab' }, { id: 'fail-tab' }]
  },
  settings: {
    nativeChatSessionOptions: {
      cursor: {
        valuesByModel: {
          'cursor-grok-4.6-high': { effort: 'high' }
        }
      }
    }
  },
  repos: [],
  worktreesByRepo: {},
  folderWorkspaces: [],
  projectGroups: [],
  closeTab: vi.fn()
}

vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => store
  }
}))

vi.mock('@/lib/launch-agent-in-new-tab', () => ({
  launchAgentInNewTab: (...args: unknown[]) => mockLaunchAgentInNewTab(...args)
}))

vi.mock('@/runtime/runtime-rpc-client', () => ({
  callRuntimeRpc: (...args: unknown[]) => mockCallRuntimeRpc(...args),
  getActiveRuntimeTarget: () => ({ kind: 'local' })
}))

vi.mock('@/lib/agent-paste-draft', () => ({
  getSettingsForAgentTabRuntimeOwner: () => ({}),
  pasteDraftWhenAgentReady: (...args: unknown[]) => mockPasteDraftWhenAgentReady(...args)
}))

vi.mock('@/runtime/web-runtime-session', () => ({
  isWebRuntimeSessionActive: () => mockIsWebRuntimeSessionActive()
}))

vi.mock('@/lib/worktree-runtime-owner', () => ({
  getRuntimeEnvironmentIdForWorktree: () => null
}))

vi.mock('sonner', () => ({
  toast: { message: mockToastMessage, error: mockToastError }
}))

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string, vars?: Record<string, string>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => vars?.[name] ?? '')
}))

const mention: ParsedTeammateMention = {
  agent: 'cursor',
  model: 'cursor-grok-4.6-high',
  token: '@cursor/cursor-grok-4.6-high',
  instruction: 'review the diff'
}

describe('dispatchNativeChatTeammate', () => {
  beforeEach(async () => {
    const { resetTeammateSlots } = await import('./native-chat-teammate-concurrency')
    const { resetTeammateInbox } = await import('./native-chat-teammate-inbox')
    resetTeammateSlots()
    resetTeammateInbox()
    vi.clearAllMocks()
    mockIsWebRuntimeSessionActive.mockReturnValue(false)
    mockLaunchAgentInNewTab.mockReturnValue({
      tabId: 'worker-tab',
      startupPlan: {},
      pasteDraftAfterLaunch: false
    })
    mockCallRuntimeRpc.mockImplementation(async (_target: unknown, method: string) => {
      if (method === 'terminal.list') {
        return {
          terminals: [
            { handle: 'lead-h', tabId: 'lead-tab' },
            { handle: 'worker-h', tabId: 'worker-tab' }
          ],
          totalCount: 2,
          truncated: false
        }
      }
      if (method === 'terminal.wait') {
        return { wait: { ok: true } }
      }
      if (method === 'orchestration.taskCreate') {
        return { task: { id: 'task-1' } }
      }
      if (method === 'orchestration.dispatch') {
        return { injected: true }
      }
      return {}
    })
  })

  it('launches the mentioned model and injects a return-to-lead orchestration task', async () => {
    const { dispatchNativeChatTeammate } = await import('./native-chat-teammate-dispatch')
    const result = await dispatchNativeChatTeammate({
      leadTabId: 'lead-tab',
      mention,
      leadContext: 'user: design teammate dispatch'
    })

    expect(result).toEqual({ ok: true, workerTabId: 'worker-tab', orchestrated: true })
    expect(mockLaunchAgentInNewTab).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: 'cursor',
        worktreeId: 'wt-1',
        sessionOptionsOverride: { model: 'cursor-grok-4.6-high', effort: 'high' },
        launchSource: 'notes_send',
        quickCommandLabel: '@cursor/cursor-grok-4.6-high'
      })
    )
    expect(mockCallRuntimeRpc).toHaveBeenCalledWith(
      { kind: 'local' },
      'orchestration.taskCreate',
      expect.objectContaining({
        displayName: '@cursor/cursor-grok-4.6-high',
        callerTerminalHandle: 'lead-h',
        spec: expect.stringContaining('they are not doing this task')
      })
    )
    expect(mockCallRuntimeRpc).toHaveBeenCalledWith({ kind: 'local' }, 'orchestration.dispatch', {
      task: 'task-1',
      to: 'worker-h',
      from: 'lead-h',
      inject: true
    })
    expect(mockPasteDraftWhenAgentReady).not.toHaveBeenCalled()
  })

  it('pastes the spec when orchestration inject is unavailable', async () => {
    mockCallRuntimeRpc.mockImplementation(async (_target: unknown, method: string) => {
      if (method === 'terminal.list') {
        return {
          terminals: [
            { handle: 'lead-h', tabId: 'lead-tab' },
            { handle: 'worker-h', tabId: 'worker-tab' }
          ],
          totalCount: 2,
          truncated: false
        }
      }
      if (method === 'terminal.wait') {
        throw new Error('timeout')
      }
      if (method === 'terminal.isRunningAgent') {
        return { isRunningAgent: false }
      }
      throw new Error(`unexpected ${method}`)
    })
    mockPasteDraftWhenAgentReady.mockResolvedValue(true)
    const { dispatchNativeChatTeammate } = await import('./native-chat-teammate-dispatch')
    const result = await dispatchNativeChatTeammate({
      leadTabId: 'lead-tab',
      mention,
      leadContext: ''
    })
    expect(result.ok).toBe(true)
    expect(result.orchestrated).toBe(false)
    expect(mockPasteDraftWhenAgentReady).toHaveBeenCalledWith(
      expect.objectContaining({
        tabId: 'worker-tab',
        submit: true,
        forcePaste: true
      })
    )
  })

  it('falls back to OpenCode when the Cursor pane never becomes an agent', async () => {
    mockLaunchAgentInNewTab
      .mockReturnValueOnce({
        tabId: 'fail-tab',
        startupPlan: {},
        pasteDraftAfterLaunch: false
      })
      .mockReturnValueOnce({
        tabId: 'worker-tab',
        startupPlan: {},
        pasteDraftAfterLaunch: false
      })
    mockCallRuntimeRpc.mockImplementation(
      async (_target: unknown, method: string, params: { terminal?: string }) => {
        if (method === 'terminal.list') {
          return {
            terminals: [
              { handle: 'lead-h', tabId: 'lead-tab' },
              { handle: 'fail-h', tabId: 'fail-tab' },
              { handle: 'worker-h', tabId: 'worker-tab' }
            ],
            totalCount: 3,
            truncated: false
          }
        }
        if (method === 'terminal.wait') {
          if (params.terminal === 'fail-h') {
            throw new Error('timeout')
          }
          return { wait: { ok: true } }
        }
        if (method === 'terminal.isRunningAgent') {
          return { isRunningAgent: params.terminal !== 'fail-h' }
        }
        if (method === 'orchestration.taskCreate') {
          return { task: { id: 'task-1' } }
        }
        if (method === 'orchestration.dispatch') {
          return { injected: true }
        }
        return {}
      }
    )
    const { dispatchNativeChatTeammate } = await import('./native-chat-teammate-dispatch')
    const result = await dispatchNativeChatTeammate({
      leadTabId: 'lead-tab',
      mention,
      leadContext: ''
    })
    expect(result.ok).toBe(true)
    expect(store.closeTab).toHaveBeenCalledWith('fail-tab', { captureRecentlyClosed: false })
    expect(mockLaunchAgentInNewTab.mock.calls.map((call) => call[0].agent)).toEqual([
      'cursor',
      'opencode'
    ])
  })

  it('refuses a sixth concurrent teammate by default', async () => {
    const { tryAcquireTeammateSlots } = await import('./native-chat-teammate-concurrency')
    expect(tryAcquireTeammateSlots(5, 5)).toBe(true)
    const { dispatchNativeChatTeammate } = await import('./native-chat-teammate-dispatch')
    const result = await dispatchNativeChatTeammate({
      leadTabId: 'lead-tab',
      mention,
      leadContext: ''
    })
    expect(result.ok).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith('Already running 5 teammates')
    expect(mockLaunchAgentInNewTab).not.toHaveBeenCalled()
  })
})
