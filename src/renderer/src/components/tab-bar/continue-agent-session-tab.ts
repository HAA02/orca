import type { AgentType } from '../../../../shared/agent-status-types'
import { isTuiAgent } from '../../../../shared/tui-agent-config'

/**
 * Resolves the tab whose agent session the "+" menu can hand off to a new model.
 *
 * Mirrors the pane context menu's source resolution: the agent detected on the
 * tab's active leaf wins, with the tab's launch hint as fallback before
 * agent-status evidence arrives.
 */
export function resolveContinueAgentSessionTabId(args: {
  activeTabId: string | null
  agentTypesByTabId: Record<string, AgentType>
  launchAgentByTabId: ReadonlyMap<string, string | null | undefined>
}): string | null {
  const { activeTabId } = args
  if (!activeTabId) {
    return null
  }
  if (isTuiAgent(args.agentTypesByTabId[activeTabId])) {
    return activeTabId
  }
  return isTuiAgent(args.launchAgentByTabId.get(activeTabId)) ? activeTabId : null
}
