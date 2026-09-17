import { CONTINUE_AGENT_SESSION_EVENT, type ContinueAgentSessionDetail } from '@/constants/terminal'

/**
 * Subscribes a pane to the tab-bar "+" handoff event.
 *
 * Why: the event is tab-scoped, so every mounted pane filters on its own tab id
 * and only the pane that owns the source session opens the continuation dialog.
 */
export function subscribeTerminalContinueAgentSession(args: {
  tabId: string
  onContinue: () => void
}): () => void {
  const onContinueRequest = (event: Event): void => {
    const detail = (event as CustomEvent<ContinueAgentSessionDetail | undefined>).detail
    if (!detail?.tabId || detail.tabId !== args.tabId) {
      return
    }
    args.onContinue()
  }
  window.addEventListener(CONTINUE_AGENT_SESSION_EVENT, onContinueRequest)
  return () => window.removeEventListener(CONTINUE_AGENT_SESSION_EVENT, onContinueRequest)
}
