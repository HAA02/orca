import {
  isNativeChatTeammateAgent,
  NATIVE_CHAT_TEAMMATE_AGENTS,
  type NativeChatTeammateAgent
} from './native-chat-teammate-mention'
import type { SessionOptionValue } from './native-chat-session-options'

export const DEFAULT_TEAMMATE_MAX_CONCURRENT = 5
const MAX_CONCURRENT_CAP = 12

export type NativeChatTeammatePreset = {
  id: string
  label: string
  agent: NativeChatTeammateAgent
  model?: string
  extraOptions?: Record<string, SessionOptionValue>
}

export type NativeChatTeammateRole = {
  role: string
  presetId: string
}

export type NativeChatTeammateRoleTemplate = {
  id: string
  label: string
  roles: NativeChatTeammateRole[]
}

export type NativeChatTeammateFallback = {
  agent: NativeChatTeammateAgent
  model?: string
}

export type NativeChatTeammateSettings = {
  presets: NativeChatTeammatePreset[]
  maxConcurrent: number
  fallbackEnabled: boolean
  fallback: NativeChatTeammateFallback[]
  roleTemplates: NativeChatTeammateRoleTemplate[]
}

export const DEFAULT_NATIVE_CHAT_TEAMMATE_PRESETS: NativeChatTeammatePreset[] = [
  { id: 'grok-high', label: 'Grok 4.6 High', agent: 'cursor', model: 'cursor-grok-4.6-high' },
  {
    id: 'grok-xhigh',
    label: 'Grok 4.6 Extra High',
    agent: 'cursor',
    model: 'cursor-grok-4.6-xhigh'
  },
  { id: 'muse-high', label: 'Muse 1.3 High', agent: 'cursor', model: 'muse-spark-1.3-high' },
  { id: 'oc-kimi', label: 'OpenCode Kimi', agent: 'opencode', model: 'opencode-go/kimi-k3' },
  { id: 'oc-glm', label: 'OpenCode GLM', agent: 'opencode', model: 'opencode-go/glm-5.2' },
  {
    id: 'oc-deepseek',
    label: 'OpenCode DeepSeek',
    agent: 'opencode',
    model: 'opencode-go/deepseek-v4.1-flash'
  },
  { id: 'astra', label: 'Codex Astra', agent: 'codex', model: 'gpt-6-astra' },
  { id: 'cheap', label: 'Cheap auxiliary', agent: 'opencode', model: 'opencode-go/kimi-k3' }
]

export const DEFAULT_NATIVE_CHAT_TEAMMATE_ROLE_TEMPLATES: NativeChatTeammateRoleTemplate[] = [
  {
    id: 'mixed-team',
    label: 'PM / implement / review',
    roles: [
      { role: 'pm', presetId: 'grok-high' },
      { role: 'implement', presetId: 'oc-kimi' },
      { role: 'review', presetId: 'astra' }
    ]
  }
]

export const DEFAULT_NATIVE_CHAT_TEAMMATE_SETTINGS: NativeChatTeammateSettings = {
  presets: DEFAULT_NATIVE_CHAT_TEAMMATE_PRESETS,
  maxConcurrent: DEFAULT_TEAMMATE_MAX_CONCURRENT,
  fallbackEnabled: true,
  fallback: [{ agent: 'opencode' }],
  roleTemplates: DEFAULT_NATIVE_CHAT_TEAMMATE_ROLE_TEMPLATES
}

export {
  extractResolvedTeammateMention,
  listTeammateLaunchAttempts,
  mergeTeammateMentionCatalog,
  teammateDispatchJobs
} from './native-chat-teammate-resolve'

const AGENT_ID_SET = new Set<string>(NATIVE_CHAT_TEAMMATE_AGENTS)
const PRESET_ID = /^[a-z][a-z0-9-]{0,47}$/

export function clampTeammateMaxConcurrent(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return DEFAULT_TEAMMATE_MAX_CONCURRENT
  }
  return Math.min(MAX_CONCURRENT_CAP, Math.max(1, Math.round(numeric)))
}

export function normalizeNativeChatTeammateSettings(value: unknown): NativeChatTeammateSettings {
  const raw =
    value && typeof value === 'object' ? (value as Partial<NativeChatTeammateSettings>) : {}
  const presets = normalizePresets(raw.presets)
  const fallback = normalizeFallback(raw.fallback)
  return {
    presets,
    maxConcurrent: clampTeammateMaxConcurrent(raw.maxConcurrent),
    fallbackEnabled: raw.fallbackEnabled !== false,
    fallback: fallback.length > 0 ? fallback : [{ agent: 'opencode' }],
    roleTemplates: normalizeTemplates(raw.roleTemplates, presets)
  }
}

export function resolveNativeChatTeammateSettings(
  settings?: { nativeChatTeammate?: NativeChatTeammateSettings | null } | null
): NativeChatTeammateSettings {
  if (!settings?.nativeChatTeammate) {
    return DEFAULT_NATIVE_CHAT_TEAMMATE_SETTINGS
  }
  return normalizeNativeChatTeammateSettings(settings.nativeChatTeammate)
}

function normalizePresets(value: unknown): NativeChatTeammatePreset[] {
  if (!Array.isArray(value)) {
    return DEFAULT_NATIVE_CHAT_TEAMMATE_PRESETS
  }
  const seen = new Set<string>()
  const presets: NativeChatTeammatePreset[] = []
  for (const item of value) {
    const preset = readPreset(item)
    if (!preset || seen.has(preset.id)) {
      continue
    }
    seen.add(preset.id)
    presets.push(preset)
  }
  return presets.length > 0 ? presets : DEFAULT_NATIVE_CHAT_TEAMMATE_PRESETS
}

function readPreset(value: unknown): NativeChatTeammatePreset | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const row = value as Partial<NativeChatTeammatePreset>
  const id = typeof row.id === 'string' ? row.id.trim().toLowerCase() : ''
  if (!PRESET_ID.test(id) || AGENT_ID_SET.has(id) || !isNativeChatTeammateAgent(row.agent)) {
    return null
  }
  const label = typeof row.label === 'string' && row.label.trim() ? row.label.trim() : id
  const model = typeof row.model === 'string' && row.model.trim() ? row.model.trim() : undefined
  const extraOptions = readExtraOptions(row.extraOptions)
  return {
    id,
    label,
    agent: row.agent,
    ...(model ? { model } : {}),
    ...(extraOptions ? { extraOptions } : {})
  }
}

function normalizeFallback(value: unknown): NativeChatTeammateFallback[] {
  if (!Array.isArray(value)) {
    return [{ agent: 'opencode' }]
  }
  const rows: NativeChatTeammateFallback[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const row = item as Partial<NativeChatTeammateFallback>
    if (!isNativeChatTeammateAgent(row.agent)) {
      continue
    }
    const model = typeof row.model === 'string' && row.model.trim() ? row.model.trim() : undefined
    rows.push({ agent: row.agent, ...(model ? { model } : {}) })
  }
  return rows
}

function normalizeTemplates(
  value: unknown,
  presets: readonly NativeChatTeammatePreset[]
): NativeChatTeammateRoleTemplate[] {
  if (!Array.isArray(value)) {
    return DEFAULT_NATIVE_CHAT_TEAMMATE_ROLE_TEMPLATES
  }
  const presetIds = new Set(presets.map((preset) => preset.id))
  const templates: NativeChatTeammateRoleTemplate[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const row = item as Partial<NativeChatTeammateRoleTemplate>
    const id = typeof row.id === 'string' ? row.id.trim().toLowerCase() : ''
    if (!PRESET_ID.test(id) || AGENT_ID_SET.has(id) || !Array.isArray(row.roles)) {
      continue
    }
    const roles = row.roles.flatMap((role) => {
      if (!role || typeof role !== 'object') {
        return []
      }
      const presetId = typeof role.presetId === 'string' ? role.presetId.trim().toLowerCase() : ''
      const roleName = typeof role.role === 'string' ? role.role.trim() : ''
      if (!presetIds.has(presetId) || !roleName) {
        return []
      }
      return [{ role: roleName, presetId }]
    })
    if (roles.length === 0) {
      continue
    }
    templates.push({
      id,
      label: typeof row.label === 'string' && row.label.trim() ? row.label.trim() : id,
      roles
    })
  }
  return templates.length > 0 ? templates : DEFAULT_NATIVE_CHAT_TEAMMATE_ROLE_TEMPLATES
}

function readExtraOptions(value: unknown): Record<string, SessionOptionValue> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const extras: Record<string, SessionOptionValue> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' || typeof entry === 'boolean') {
      extras[key] = entry
    }
  }
  return Object.keys(extras).length > 0 ? extras : undefined
}
