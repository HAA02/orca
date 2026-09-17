import { useAppStore } from '@/store'
import { launchAgentInNewTab } from '@/lib/launch-agent-in-new-tab'
import { sessionOptionValueIsValid } from '../../../shared/agent-session-option-catalog'
import { listTeammateLaunchAttempts } from '../../../shared/native-chat-teammate-presets'
import type { NativeChatTeammateSettings } from '../../../shared/native-chat-teammate-presets'
import type { ParsedTeammateMention } from '../../../shared/native-chat-teammate-mention'
import type { SessionOptionValue } from '../../../shared/native-chat-session-options'
import type { RuntimeTerminalSummary } from '../../../shared/runtime-types'

export function teammateLaunchSessionOptions(
  mention: ParsedTeammateMention
): Record<string, SessionOptionValue> | undefined {
  const values: Record<string, SessionOptionValue> = {}
  if (mention.model) {
    values.model = mention.model
  }
  const persisted = useAppStore.getState().settings?.nativeChatSessionOptions?.[mention.agent]
  const stored = mention.model ? persisted?.valuesByModel?.[mention.model] : undefined
  if (stored) {
    for (const [id, value] of Object.entries(stored)) {
      if (sessionOptionValueIsValid(value)) {
        values[id] = value
      }
    }
  }
  if (mention.extraOptions) {
    for (const [id, value] of Object.entries(mention.extraOptions)) {
      if (sessionOptionValueIsValid(value)) {
        values[id] = value
      }
    }
  }
  return Object.keys(values).length > 0 ? values : undefined
}

export async function launchTeammateWithFallback(args: {
  mention: ParsedTeammateMention
  worktreeId: string
  spec: string
  webHost: boolean
  teammateSettings: NativeChatTeammateSettings
  waitForWorker: (tabId: string) => Promise<RuntimeTerminalSummary | null>
  isWorkerRunning: (handle: string) => Promise<boolean>
  waitUntilIdle: (handle: string) => Promise<boolean>
}): Promise<{
  mention: ParsedTeammateMention
  tabId: string
  handle?: string
  usedFallback: boolean
} | null> {
  const attempts = listTeammateLaunchAttempts(args.mention, args.teammateSettings)
  for (const [index, attempt] of attempts.entries()) {
    const launched = launchAgentInNewTab({
      agent: attempt.agent,
      worktreeId: args.worktreeId,
      prompt: args.webHost ? args.spec : undefined,
      promptDelivery: args.webHost ? 'submit-after-ready' : undefined,
      sessionOptionsOverride: teammateLaunchSessionOptions(attempt),
      launchSource: 'notes_send',
      quickCommandLabel: attempt.token
    })
    const tabId = launched?.tabId ?? null
    if (!tabId) {
      continue
    }
    if (args.webHost) {
      return { mention: attempt, tabId, usedFallback: index > 0 }
    }
    const worker = await args.waitForWorker(tabId)
    if (!worker?.handle) {
      useAppStore.getState().closeTab(tabId, { captureRecentlyClosed: false })
      continue
    }
    const last = index === attempts.length - 1
    const idle = await args.waitUntilIdle(worker.handle)
    if (!idle && !(await args.isWorkerRunning(worker.handle)) && !last) {
      useAppStore.getState().closeTab(tabId, { captureRecentlyClosed: false })
      continue
    }
    return {
      mention: attempt,
      tabId,
      handle: worker.handle,
      usedFallback: index > 0
    }
  }
  return null
}
