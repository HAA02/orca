import { findTerminalTabWorktreeId } from '@/components/native-chat/native-chat-file-link'
import { getConnectionIdFromState } from '@/lib/connection-context'
import { getRuntimeEnvironmentIdForWorktree } from '@/lib/worktree-runtime-owner'
import type { AppState } from '@/store/types'

export function selectTeammateDetectedAgents(state: AppState, terminalTabId: string): string[] {
  const worktreeId = state.tabsByWorktree
    ? findTerminalTabWorktreeId(state.tabsByWorktree, terminalTabId)
    : null
  if (worktreeId) {
    const runtimeId = getRuntimeEnvironmentIdForWorktree(state, worktreeId)
    if (runtimeId) {
      return state.runtimeDetectedAgentIds?.[runtimeId] ?? []
    }
    const connectionId = getConnectionIdFromState(state, worktreeId)
    if (connectionId) {
      return state.remoteDetectedAgentIds?.[connectionId] ?? []
    }
  }
  return state.detectedAgentIds ?? []
}
