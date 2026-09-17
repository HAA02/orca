import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTINUE_AGENT_SESSION_EVENT } from '@/constants/terminal'
import { subscribeTerminalContinueAgentSession } from './terminal-continue-agent-session'

function dispatchContinue(tabId: string | undefined): void {
  window.dispatchEvent(
    new CustomEvent(CONTINUE_AGENT_SESSION_EVENT, { detail: tabId ? { tabId } : undefined })
  )
}

describe('subscribeTerminalContinueAgentSession', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('invokes the callback only for the subscribed tab', () => {
    const onContinue = vi.fn()
    const unsubscribe = subscribeTerminalContinueAgentSession({ tabId: 'tab-1', onContinue })

    dispatchContinue('tab-2')
    expect(onContinue).not.toHaveBeenCalled()

    dispatchContinue('tab-1')
    expect(onContinue).toHaveBeenCalledOnce()

    unsubscribe()
  })

  it('ignores events without a tab id', () => {
    const onContinue = vi.fn()
    const unsubscribe = subscribeTerminalContinueAgentSession({ tabId: 'tab-1', onContinue })

    dispatchContinue(undefined)
    expect(onContinue).not.toHaveBeenCalled()

    unsubscribe()
  })

  it('stops observing after unsubscribe', () => {
    const onContinue = vi.fn()
    const unsubscribe = subscribeTerminalContinueAgentSession({ tabId: 'tab-1', onContinue })
    unsubscribe()

    dispatchContinue('tab-1')
    expect(onContinue).not.toHaveBeenCalled()
  })
})
