import type { NativeChatMessage } from '../../../shared/native-chat-types'
import { releaseTeammateSlot, registerTeammateTab } from './native-chat-teammate-concurrency'
import { callRuntimeRpc, type RuntimeClientTarget } from '@/runtime/runtime-rpc-client'

export type TeammateInboxEntry = {
  id: string
  token: string
  subject: string
  body: string
  receivedAt: number
}

type InboxMessage = {
  id?: string
  subject?: string
  body?: string
  payload?: string | null
  type?: string
}

type TrackedTask = {
  tabId: string
  token: string
}

const INBOX_LIMIT = 16
const WAIT_MS = 1_800_000
const cache = new Map<string, TeammateInboxEntry[]>()
const listeners = new Map<string, Set<() => void>>()
const pumps = new Map<
  string,
  {
    running: boolean
    tasks: Map<string, TrackedTask>
  }
>()
let inboxCounter = 0

export function readTeammateInbox(paneKey: string): TeammateInboxEntry[] {
  return [...(cache.get(paneKey) ?? [])]
}

export function subscribeTeammateInbox(paneKey: string, listener: () => void): () => void {
  const bucket = listeners.get(paneKey) ?? new Set<() => void>()
  bucket.add(listener)
  listeners.set(paneKey, bucket)
  return () => {
    bucket.delete(listener)
    if (bucket.size === 0) {
      listeners.delete(paneKey)
    }
  }
}

export function appendTeammateInbox(paneKey: string, entry: TeammateInboxEntry): void {
  const next = [...(cache.get(paneKey) ?? []), entry].slice(-INBOX_LIMIT)
  cache.set(paneKey, next)
  for (const listener of listeners.get(paneKey) ?? []) {
    listener()
  }
}

export function resetTeammateInbox(): void {
  cache.clear()
  listeners.clear()
  pumps.clear()
  inboxCounter = 0
}

export function teammateInboxAsMessages(
  entries: readonly TeammateInboxEntry[]
): NativeChatMessage[] {
  return entries.map((entry) => ({
    id: `teammate:${entry.id}`,
    role: 'assistant' as const,
    timestamp: entry.receivedAt,
    source: 'scrape' as const,
    blocks: [
      {
        type: 'text' as const,
        text: formatTeammateInboxText(entry)
      }
    ]
  }))
}

export function applyWorkerDoneMessages(
  paneKey: string,
  messages: readonly InboxMessage[],
  tasks: Map<string, TrackedTask>
): void {
  for (const message of messages) {
    const taskId = payloadTaskId(message.payload)
    const tracked = (taskId ? tasks.get(taskId) : undefined) ?? [...tasks.values()][0]
    const token = tracked?.token ?? 'teammate'
    appendTeammateInbox(paneKey, {
      id: message.id ?? `inbox-${inboxCounter++}`,
      token,
      subject: message.subject?.trim() || 'worker_done',
      body: message.body?.trim() ?? '',
      receivedAt: Date.now()
    })
    if (tracked) {
      for (const [id, row] of tasks) {
        if (row.tabId === tracked.tabId) {
          tasks.delete(id)
        }
      }
      releaseTeammateSlot(tracked.tabId)
    }
  }
}

export function startTeammateInboxPump(args: {
  paneKey: string
  leadHandle: string
  runtimeTarget: RuntimeClientTarget
  taskId: string
  workerTabId: string
  token: string
}): void {
  const state = pumps.get(args.paneKey) ?? { running: false, tasks: new Map<string, TrackedTask>() }
  state.tasks.set(args.taskId, { tabId: args.workerTabId, token: args.token })
  registerTeammateTab(args.workerTabId)
  pumps.set(args.paneKey, state)
  if (state.running) {
    return
  }
  state.running = true
  void pumpTeammateInbox(args.paneKey, args.leadHandle, args.runtimeTarget)
}

async function pumpTeammateInbox(
  paneKey: string,
  leadHandle: string,
  runtimeTarget: RuntimeClientTarget
): Promise<void> {
  const state = pumps.get(paneKey)
  if (!state) {
    return
  }
  try {
    while (state.tasks.size > 0) {
      let messages: InboxMessage[] = []
      try {
        const result = await callRuntimeRpc<{ messages?: InboxMessage[]; count?: number }>(
          runtimeTarget,
          'orchestration.check',
          {
            terminal: leadHandle,
            types: 'worker_done',
            wait: true,
            timeoutMs: WAIT_MS
          },
          { timeoutMs: WAIT_MS + 5_000 }
        )
        messages = result.messages ?? []
      } catch {
        break
      }
      if (messages.length === 0) {
        break
      }
      applyWorkerDoneMessages(paneKey, messages, state.tasks)
    }
  } finally {
    state.running = false
    if (state.tasks.size === 0) {
      pumps.delete(paneKey)
    }
  }
}

export function formatTeammateInboxText(entry: TeammateInboxEntry): string {
  const body = entry.body.trim()
  return body ? `${entry.token} · ${entry.subject}\n\n${body}` : `${entry.token} · ${entry.subject}`
}

function payloadTaskId(payload: string | null | undefined): string | undefined {
  if (!payload) {
    return undefined
  }
  try {
    const parsed = JSON.parse(payload) as { taskId?: unknown }
    return typeof parsed.taskId === 'string' && parsed.taskId.trim() ? parsed.taskId : undefined
  } catch {
    return undefined
  }
}
