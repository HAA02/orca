import type { AgentType } from './agent-status-types'
import {
  catalogDefaultModel,
  getAgentSessionOptionCatalog,
  sessionOptionValueIsValid
} from './agent-session-option-catalog'
import type {
  PersistedNativeChatSessionOptions,
  SessionOptionValue
} from './native-chat-session-options'

export function resolveNativeChatSessionOptionDefaults(
  persisted: PersistedNativeChatSessionOptions | null | undefined,
  agent: AgentType,
  override?: Record<string, SessionOptionValue>
): Record<string, SessionOptionValue> | undefined {
  if (override && Object.keys(override).length > 0) {
    return { ...override }
  }
  return resolvePersistedNativeChatSessionOptionDefaults(persisted, agent)
}

function resolvePersistedNativeChatSessionOptionDefaults(
  persisted: PersistedNativeChatSessionOptions | null | undefined,
  agent: AgentType
): Record<string, SessionOptionValue> | undefined {
  const entry = persisted?.[agent]
  // Why: untouched settings must preserve the agent CLI's configured defaults;
  // only an explicit user selection authorizes launch flags. Catalogs that set
  // launchDefaultModel opt out of that rule so Orca can pin the model itself.
  const modelId =
    (typeof entry?.model === 'string' && entry.model.trim() ? entry.model : undefined) ??
    catalogLaunchDefaultModelId(agent)
  if (!modelId) {
    return undefined
  }
  const values: Record<string, SessionOptionValue> = { model: modelId }
  const storedValues = entry?.valuesByModel?.[modelId]
  if (storedValues && typeof storedValues === 'object') {
    for (const [id, value] of Object.entries(storedValues)) {
      if (sessionOptionValueIsValid(value)) {
        values[id] = value
      }
    }
  }
  return values
}

function catalogLaunchDefaultModelId(agent: AgentType): string | undefined {
  const catalog = getAgentSessionOptionCatalog(agent)
  return catalog?.launchDefaultModel ? catalogDefaultModel(catalog)?.id : undefined
}

export function updateNativeChatSessionOptionDefaults(args: {
  persisted: PersistedNativeChatSessionOptions | null | undefined
  agent: AgentType
  modelId: string
  optionId: string
  value: SessionOptionValue
}): PersistedNativeChatSessionOptions {
  const currentAgent = args.persisted?.[args.agent]
  const currentModelValues = currentAgent?.valuesByModel?.[args.modelId] ?? {}
  const valuesByModel = {
    ...currentAgent?.valuesByModel,
    ...(args.optionId === 'model'
      ? {}
      : {
          [args.modelId]: { ...currentModelValues, [args.optionId]: args.value }
        })
  }
  return {
    ...args.persisted,
    [args.agent]: {
      ...currentAgent,
      model: args.optionId === 'model' ? String(args.value) : args.modelId,
      valuesByModel
    }
  }
}
