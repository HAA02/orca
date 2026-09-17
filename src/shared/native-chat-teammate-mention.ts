import { getAgentSessionOptionCatalog } from './agent-session-option-catalog'
import type { NativeChatMessage } from './native-chat-types'
import { isTuiAgent } from './tui-agent-config'
import type { TuiAgent } from './types'

/** Agents that can be mentioned as in-session teammates (session-option catalogs). */
export const NATIVE_CHAT_TEAMMATE_AGENTS = [
  'cursor',
  'opencode',
  'codex',
  'claude',
  'gemini',
  'pi'
] as const satisfies readonly TuiAgent[]

export type NativeChatTeammateAgent = (typeof NATIVE_CHAT_TEAMMATE_AGENTS)[number]

export type TeammateMentionKind = 'agent' | 'preset' | 'roster'

export type TeammateMentionOption = {
  agent: NativeChatTeammateAgent
  model?: string
  label: string
  token: string
  kind?: TeammateMentionKind
  presetId?: string
}

export type ParsedTeammateMember = {
  role?: string
  agent: NativeChatTeammateAgent
  model?: string
  token: string
  extraOptions?: Record<string, string | boolean>
}

export type ParsedTeammateMention = {
  agent: NativeChatTeammateAgent
  model?: string
  token: string
  instruction: string
  extraOptions?: Record<string, string | boolean>
  members?: ParsedTeammateMember[]
}

const TEAMATE_AGENT_SET = new Set<string>(NATIVE_CHAT_TEAMMATE_AGENTS)

const LEAD_CONTEXT_MAX_CHARS = 6000
const PICKER_MODEL_LIMIT = 40

export function isNativeChatTeammateAgent(value: unknown): value is NativeChatTeammateAgent {
  return typeof value === 'string' && TEAMATE_AGENT_SET.has(value)
}

/** Paths and emails stay file mentions; agent tokens become teammate mentions. */
export function isFileLikeMentionQuery(query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) {
    return false
  }
  if (trimmed.startsWith('.') || trimmed.startsWith('/') || trimmed.startsWith('~')) {
    return true
  }
  const first = trimmed.split('/')[0]?.toLowerCase() ?? ''
  if (isNativeChatTeammateAgent(first)) {
    return false
  }
  return /\.[a-z0-9]{1,8}$/i.test(trimmed)
}

export function parseTeammateMentionToken(token: string): {
  agent: NativeChatTeammateAgent
  model?: string
} | null {
  const trimmed = token.trim().replace(/^@/, '')
  if (!trimmed) {
    return null
  }
  const slash = trimmed.indexOf('/')
  const agentId = (slash < 0 ? trimmed : trimmed.slice(0, slash)).toLowerCase()
  if (!isNativeChatTeammateAgent(agentId)) {
    return null
  }
  const model = slash < 0 ? undefined : trimmed.slice(slash + 1).trim()
  return model ? { agent: agentId, model } : { agent: agentId }
}

export function splitTeammateAtToken(text: string): {
  token: string
  instruction: string
  id: string
} | null {
  const match = text.match(/(^|\s)@([a-z][a-z0-9-]*)(?:\/(\S+))?/i)
  if (!match || match.index === undefined) {
    return null
  }
  const atIndex = match.index + match[1].length
  const consumed = text.slice(atIndex).match(/^@\S+/)?.[0]
  if (!consumed || isFileLikeMentionQuery(consumed.slice(1))) {
    return null
  }
  const instruction = `${text.slice(0, atIndex)}${text.slice(atIndex + consumed.length)}`
    .replace(/\s+/g, ' ')
    .trim()
  return {
    token: consumed,
    instruction,
    id: match[2].toLowerCase()
  }
}

export function extractTeammateMention(text: string): ParsedTeammateMention | null {
  const split = splitTeammateAtToken(text)
  if (!split) {
    return null
  }
  const parsed = parseTeammateMentionToken(split.token)
  if (!parsed) {
    return null
  }
  return {
    agent: parsed.agent,
    ...(parsed.model ? { model: parsed.model } : {}),
    token: split.token,
    instruction: split.instruction
  }
}

export function filterTeammateMentions(
  options: readonly TeammateMentionOption[],
  query: string
): TeammateMentionOption[] {
  const normalized = query.trim().toLowerCase().replace(/^@/, '')
  if (!normalized) {
    return options.filter(
      (option) => option.model === undefined || option.kind === 'preset' || option.kind === 'roster'
    )
  }
  return options.filter((option) => {
    const haystack =
      `${option.token} ${option.label} ${option.agent} ${option.model ?? ''}`.toLowerCase()
    return haystack.includes(normalized) || option.token.replace(/^@/, '').startsWith(normalized)
  })
}

export function buildTeammateMentionCatalog(args: {
  detectedAgents: readonly string[]
  discoveredModelsByAgent?: Partial<Record<string, { id: string; label?: string }[]>>
}): TeammateMentionOption[] {
  const detected = new Set(
    args.detectedAgents.filter((agent): agent is NativeChatTeammateAgent =>
      isNativeChatTeammateAgent(agent)
    )
  )
  const options: TeammateMentionOption[] = []
  for (const agent of NATIVE_CHAT_TEAMMATE_AGENTS) {
    if (detected.size > 0 && !detected.has(agent)) {
      continue
    }
    options.push({
      agent,
      label: agent,
      token: `@${agent}`
    })
    const live = args.discoveredModelsByAgent?.[agent] ?? []
    const seed = getAgentSessionOptionCatalog(agent)?.models ?? []
    const seen = new Set<string>()
    const models = [...live, ...seed.map((model) => ({ id: model.id, label: model.label }))]
    let added = 0
    for (const model of models) {
      const id = model.id.trim()
      if (!id || seen.has(id) || added >= PICKER_MODEL_LIMIT) {
        continue
      }
      seen.add(id)
      added += 1
      options.push({
        agent,
        model: id,
        label: model.label?.trim() || id,
        token: `@${agent}/${id}`
      })
    }
  }
  return options
}

export function excerptNativeChatLeadContext(
  messages: readonly NativeChatMessage[],
  maxChars = LEAD_CONTEXT_MAX_CHARS
): string {
  const turns: string[] = []
  for (const message of messages.slice(-12)) {
    if (message.role !== 'user' && message.role !== 'assistant') {
      continue
    }
    const text = message.blocks
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('\n')
      .trim()
    if (!text) {
      continue
    }
    turns.push(`${message.role}: ${text}`)
  }
  const joined = turns.join('\n\n')
  if (joined.length <= maxChars) {
    return joined
  }
  return joined.slice(-maxChars)
}

export function buildTeammateTaskSpec(args: {
  instruction: string
  context: string
  agent: string
  model?: string
}): string {
  const modelLine = args.model ? `Model: ${args.model}\n` : ''
  const contextBlock = args.context.trim()
    ? `Lead session context (do not wait for the lead; they are not doing this task):\n\n${args.context.trim()}\n\n`
    : ''
  return `${contextBlock}${modelLine}Agent: ${args.agent}\n\n--- TASK ---\n${args.instruction.trim() || 'Continue the lead session work described in the context.'}\n`
}

export function teammateMentionInsertToken(option: TeammateMentionOption): string {
  return option.token.replace(/^@/, '')
}

export function isLaunchableTeammateAgent(agent: string): agent is TuiAgent {
  return isTuiAgent(agent) && isNativeChatTeammateAgent(agent)
}
