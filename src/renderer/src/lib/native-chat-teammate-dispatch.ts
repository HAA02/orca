import { toast } from 'sonner'
import { useAppStore } from '@/store'
import {
  getSettingsForAgentTabRuntimeOwner,
  pasteDraftWhenAgentReady
} from '@/lib/agent-paste-draft'
import { getRuntimeEnvironmentIdForWorktree } from '@/lib/worktree-runtime-owner'
import { isWebRuntimeSessionActive } from '@/runtime/web-runtime-session'
import {
  callRuntimeRpc,
  getActiveRuntimeTarget,
  type RuntimeClientTarget
} from '@/runtime/runtime-rpc-client'
import { translate } from '@/i18n/i18n'
import {
  buildTeammateTaskSpec,
  isLaunchableTeammateAgent
} from '../../../shared/native-chat-teammate-mention'
import {
  resolveNativeChatTeammateSettings,
  teammateDispatchJobs
} from '../../../shared/native-chat-teammate-presets'
import type { ParsedTeammateMention } from '../../../shared/native-chat-teammate-mention'
import type {
  RuntimeTerminalListResult,
  RuntimeTerminalSummary
} from '../../../shared/runtime-types'
import { launchTeammateWithFallback } from './native-chat-teammate-launch'
import { releaseTeammateSlot, tryAcquireTeammateSlots } from './native-chat-teammate-concurrency'
import { startTeammateInboxPump } from './native-chat-teammate-inbox'

const AGENT_READY_TIMEOUT_MS = 45_000
const POLL_MS = 250

export type DispatchNativeChatTeammateArgs = {
  leadTabId: string
  mention: ParsedTeammateMention
  leadContext: string
  paneKey?: string
}

export type DispatchNativeChatTeammateResult = {
  ok: boolean
  workerTabId?: string
  orchestrated?: boolean
}

export async function dispatchNativeChatTeammate(
  args: DispatchNativeChatTeammateArgs
): Promise<DispatchNativeChatTeammateResult> {
  const jobs = teammateDispatchJobs(args.mention)
  if (jobs.some((job) => !isLaunchableTeammateAgent(job.agent))) {
    toast.error(
      translate('components.native-chat.composer.teammateUnknownAgent', 'Unknown teammate agent')
    )
    return { ok: false }
  }

  const store = useAppStore.getState()
  const worktreeId = findWorktreeIdForTab(store.tabsByWorktree, args.leadTabId)
  if (!worktreeId) {
    toast.error(
      translate(
        'components.native-chat.composer.teammateMissingWorktree',
        'Could not find this chat’s worktree'
      )
    )
    return { ok: false }
  }

  const teammateSettings = resolveNativeChatTeammateSettings(store.settings)
  if (!tryAcquireTeammateSlots(jobs.length, teammateSettings.maxConcurrent)) {
    toast.error(
      translate(
        'components.native-chat.composer.teammateBusy',
        'Already running {{limit}} teammates',
        { limit: String(teammateSettings.maxConcurrent) }
      )
    )
    return { ok: false }
  }

  const runtimeEnvironmentId = getRuntimeEnvironmentIdForWorktree(store, worktreeId)
  const webHost = isWebRuntimeSessionActive(runtimeEnvironmentId)
  const runtimeTarget = getActiveRuntimeTarget(getSettingsForAgentTabRuntimeOwner(args.leadTabId))
  const launched: DispatchNativeChatTeammateResult[] = []

  for (const job of jobs) {
    const result = await dispatchOneTeammate({
      job,
      worktreeId,
      webHost,
      runtimeTarget,
      leadTabId: args.leadTabId,
      leadContext: args.leadContext,
      paneKey: args.paneKey,
      teammateSettings
    })
    if (!result.ok) {
      releaseTeammateSlot(result.workerTabId)
      continue
    }
    launched.push(result)
  }

  if (launched.length === 0) {
    toast.error(
      translate(
        'components.native-chat.composer.teammateLaunchFailed',
        'Could not start teammate {{token}}',
        {
          token: args.mention.token
        }
      )
    )
    return { ok: false }
  }

  toast.message(
    translate('components.native-chat.composer.teammateDelegated', 'Delegated to {{token}}', {
      token: args.mention.token
    })
  )
  return {
    ok: true,
    workerTabId: launched[0].workerTabId,
    orchestrated: launched.some((row) => row.orchestrated)
  }
}

async function dispatchOneTeammate(args: {
  job: ParsedTeammateMention
  worktreeId: string
  webHost: boolean
  runtimeTarget: RuntimeClientTarget
  leadTabId: string
  leadContext: string
  paneKey?: string
  teammateSettings: ReturnType<typeof resolveNativeChatTeammateSettings>
}): Promise<DispatchNativeChatTeammateResult> {
  const spec = buildTeammateTaskSpec({
    instruction: args.job.instruction,
    context: args.leadContext,
    agent: args.job.agent,
    model: args.job.model
  })
  const launched = await launchTeammateWithFallback({
    mention: args.job,
    worktreeId: args.worktreeId,
    spec,
    webHost: args.webHost,
    teammateSettings: args.teammateSettings,
    waitForWorker: (tabId) =>
      waitForTerminalRow(args.runtimeTarget, args.worktreeId, tabId, AGENT_READY_TIMEOUT_MS),
    isWorkerRunning: async (handle) => {
      const running = await callRuntimeRpc<{ isRunningAgent: boolean }>(
        args.runtimeTarget,
        'terminal.isRunningAgent',
        { terminal: handle }
      )
      return running.isRunningAgent
    },
    waitUntilIdle: async (handle) => {
      try {
        await callRuntimeRpc(
          args.runtimeTarget,
          'terminal.wait',
          { terminal: handle, for: 'tui-idle', timeoutMs: AGENT_READY_TIMEOUT_MS },
          { timeoutMs: AGENT_READY_TIMEOUT_MS + 5_000 }
        )
        return true
      } catch {
        return false
      }
    }
  })
  const workerTabId = launched?.tabId
  if (!launched || !workerTabId) {
    return { ok: false }
  }
  if (args.webHost) {
    return { ok: true, workerTabId }
  }

  const orchestrated = await injectOrchestratedTeammateTask({
    runtimeTarget: args.runtimeTarget,
    worktreeId: args.worktreeId,
    leadTabId: args.leadTabId,
    workerTabId,
    workerHandle: launched.handle,
    spec,
    taskTitle: args.job.instruction.trim().slice(0, 72) || args.job.token,
    displayName: args.job.token,
    paneKey: args.paneKey
  })
  if (!orchestrated) {
    const pasted = await pasteDraftWhenAgentReady({
      tabId: workerTabId,
      content: spec,
      agent: args.job.agent,
      submit: true,
      forcePaste: true
    })
    if (!pasted) {
      return { ok: false, workerTabId }
    }
  }
  return { ok: true, workerTabId, orchestrated }
}

async function injectOrchestratedTeammateTask(args: {
  runtimeTarget: RuntimeClientTarget
  worktreeId: string
  leadTabId: string
  workerTabId: string
  workerHandle?: string
  spec: string
  taskTitle: string
  displayName: string
  paneKey?: string
}): Promise<boolean> {
  const lead = await waitForTerminalRow(args.runtimeTarget, args.worktreeId, args.leadTabId, 8_000)
  const workerHandle =
    args.workerHandle ??
    (
      await waitForTerminalRow(
        args.runtimeTarget,
        args.worktreeId,
        args.workerTabId,
        AGENT_READY_TIMEOUT_MS
      )
    )?.handle
  if (!lead?.handle || !workerHandle) {
    return false
  }
  try {
    const created = await callRuntimeRpc<{ task: { id: string } }>(
      args.runtimeTarget,
      'orchestration.taskCreate',
      {
        spec: args.spec,
        taskTitle: args.taskTitle,
        displayName: args.displayName,
        callerTerminalHandle: lead.handle
      }
    )
    await callRuntimeRpc(args.runtimeTarget, 'orchestration.dispatch', {
      task: created.task.id,
      to: workerHandle,
      from: lead.handle,
      inject: true
    })
    if (args.paneKey) {
      startTeammateInboxPump({
        paneKey: args.paneKey,
        leadHandle: lead.handle,
        runtimeTarget: args.runtimeTarget,
        taskId: created.task.id,
        workerTabId: args.workerTabId,
        token: args.displayName
      })
    }
    return true
  } catch {
    return false
  }
}

async function waitForTerminalRow(
  runtimeTarget: RuntimeClientTarget,
  worktreeId: string,
  tabId: string,
  timeoutMs: number
): Promise<RuntimeTerminalSummary | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() <= deadline) {
    try {
      const listed = await callRuntimeRpc<RuntimeTerminalListResult>(
        runtimeTarget,
        'terminal.list',
        { worktree: `id:${worktreeId}` }
      )
      const row = listed.terminals.find((terminal) => terminal.tabId === tabId && terminal.handle)
      if (row) {
        return row
      }
    } catch {
      // PTY graph may not have registered the new tab yet.
    }
    await sleep(POLL_MS)
  }
  return null
}

function findWorktreeIdForTab(
  tabsByWorktree: Record<string, { id: string }[]> | null | undefined,
  tabId: string
): string | null {
  if (!tabsByWorktree) {
    return null
  }
  for (const [worktreeId, tabs] of Object.entries(tabsByWorktree)) {
    if (tabs.some((tab) => tab.id === tabId)) {
      return worktreeId
    }
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
