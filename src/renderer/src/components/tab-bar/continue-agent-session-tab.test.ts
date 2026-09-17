import { describe, expect, it } from 'vitest'
import { resolveContinueAgentSessionTabId } from './continue-agent-session-tab'

const noLaunchHints = new Map<string, string | null | undefined>()

describe('resolveContinueAgentSessionTabId', () => {
  it('returns the active tab when agent status identifies a TUI agent on it', () => {
    expect(
      resolveContinueAgentSessionTabId({
        activeTabId: 'tab-1',
        agentTypesByTabId: { 'tab-1': 'claude' },
        launchAgentByTabId: noLaunchHints
      })
    ).toBe('tab-1')
  })

  it('falls back to the tab launch hint before agent status arrives', () => {
    expect(
      resolveContinueAgentSessionTabId({
        activeTabId: 'tab-2',
        agentTypesByTabId: {},
        launchAgentByTabId: new Map([['tab-2', 'codex']])
      })
    ).toBe('tab-2')
  })

  it('hides the entry for plain shells and non-TUI agent types', () => {
    expect(
      resolveContinueAgentSessionTabId({
        activeTabId: 'tab-3',
        agentTypesByTabId: {},
        launchAgentByTabId: new Map([['tab-3', undefined]])
      })
    ).toBeNull()
    expect(
      resolveContinueAgentSessionTabId({
        activeTabId: 'tab-4',
        agentTypesByTabId: { 'tab-4': 'shell' },
        launchAgentByTabId: noLaunchHints
      })
    ).toBeNull()
  })

  it('hides the entry when the tab strip has no active terminal tab', () => {
    expect(
      resolveContinueAgentSessionTabId({
        activeTabId: null,
        agentTypesByTabId: { 'tab-1': 'claude' },
        launchAgentByTabId: noLaunchHints
      })
    ).toBeNull()
  })

  it('does not treat an editor tab id as a continuation source', () => {
    expect(
      resolveContinueAgentSessionTabId({
        activeTabId: 'file-tab-1',
        agentTypesByTabId: { 'tab-1': 'claude' },
        launchAgentByTabId: noLaunchHints
      })
    ).toBeNull()
  })
})
