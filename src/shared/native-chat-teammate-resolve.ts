import {
  isNativeChatTeammateAgent,
  splitTeammateAtToken,
  type NativeChatTeammateAgent,
  type ParsedTeammateMention,
  type ParsedTeammateMember,
  type TeammateMentionOption
} from './native-chat-teammate-mention'
import type {
  NativeChatTeammatePreset,
  NativeChatTeammateRole,
  NativeChatTeammateSettings
} from './native-chat-teammate-presets'

export function extractResolvedTeammateMention(
  text: string,
  teammateSettings: NativeChatTeammateSettings
): ParsedTeammateMention | null {
  const split = splitTeammateAtToken(text)
  if (!split) {
    return null
  }
  const agentId = split.id.includes('/') ? split.id.slice(0, split.id.indexOf('/')) : split.id
  if (isNativeChatTeammateAgent(agentId)) {
    const slash = split.token.indexOf('/')
    const model = slash < 0 ? undefined : split.token.slice(slash + 1).trim()
    return {
      agent: agentId,
      ...(model ? { model } : {}),
      token: split.token,
      instruction: split.instruction
    }
  }
  const preset = teammateSettings.presets.find((row) => row.id === split.id)
  if (preset) {
    return mentionFromPreset(preset, split.token, split.instruction)
  }
  const template = teammateSettings.roleTemplates.find((row) => row.id === split.id)
  if (!template) {
    return null
  }
  const members = template.roles
    .map((role) => memberFromRole(role, teammateSettings.presets))
    .filter((row): row is ParsedTeammateMember => row !== null)
  if (members.length === 0) {
    return null
  }
  return {
    agent: members[0].agent,
    ...(members[0].model ? { model: members[0].model } : {}),
    token: `@${template.id}`,
    instruction: split.instruction,
    members
  }
}

export function mergeTeammateMentionCatalog(
  agentCatalog: readonly TeammateMentionOption[],
  teammateSettings: NativeChatTeammateSettings,
  detectedAgents: readonly string[] = []
): TeammateMentionOption[] {
  const detected = new Set(
    detectedAgents.filter((agent): agent is NativeChatTeammateAgent =>
      isNativeChatTeammateAgent(agent)
    )
  )
  const options: TeammateMentionOption[] = []
  for (const preset of teammateSettings.presets) {
    if (detected.size > 0 && !detected.has(preset.agent)) {
      continue
    }
    options.push({
      agent: preset.agent,
      ...(preset.model ? { model: preset.model } : {}),
      label: preset.label,
      token: `@${preset.id}`,
      kind: 'preset',
      presetId: preset.id
    })
  }
  for (const template of teammateSettings.roleTemplates) {
    const members = template.roles
      .map((role) => teammateSettings.presets.find((preset) => preset.id === role.presetId))
      .filter((preset): preset is NativeChatTeammatePreset => preset !== undefined)
    if (members.length === 0) {
      continue
    }
    if (detected.size > 0 && members.some((preset) => !detected.has(preset.agent))) {
      continue
    }
    options.push({
      agent: members[0].agent,
      label: template.label,
      token: `@${template.id}`,
      kind: 'roster'
    })
  }
  return [...options, ...agentCatalog]
}

export function listTeammateLaunchAttempts(
  mention: ParsedTeammateMention,
  teammateSettings: NativeChatTeammateSettings
): ParsedTeammateMention[] {
  const attempts = [mention]
  if (!teammateSettings.fallbackEnabled) {
    return attempts
  }
  for (const fallback of teammateSettings.fallback) {
    const sameAgent = fallback.agent === mention.agent
    const sameModel = (fallback.model ?? mention.model) === mention.model
    if (sameAgent && (fallback.model === undefined || sameModel)) {
      continue
    }
    attempts.push({
      agent: fallback.agent,
      ...(fallback.model ? { model: fallback.model } : {}),
      token: mention.token,
      instruction: mention.instruction
    })
  }
  return attempts
}

export function teammateDispatchJobs(mention: ParsedTeammateMention): ParsedTeammateMention[] {
  if (!mention.members?.length) {
    return [mention]
  }
  return mention.members.map((member) => ({
    agent: member.agent,
    ...(member.model ? { model: member.model } : {}),
    ...(member.extraOptions ? { extraOptions: member.extraOptions } : {}),
    token: member.token,
    instruction: member.role
      ? `Role: ${member.role}\n${mention.instruction}`.trim()
      : mention.instruction
  }))
}

function mentionFromPreset(
  preset: NativeChatTeammatePreset,
  token: string,
  instruction: string
): ParsedTeammateMention {
  return {
    agent: preset.agent,
    ...(preset.model ? { model: preset.model } : {}),
    ...(preset.extraOptions ? { extraOptions: preset.extraOptions } : {}),
    token: token.startsWith('@') ? token : `@${preset.id}`,
    instruction
  }
}

function memberFromRole(
  role: NativeChatTeammateRole,
  presets: readonly NativeChatTeammatePreset[]
): ParsedTeammateMember | null {
  const preset = presets.find((row) => row.id === role.presetId)
  if (!preset) {
    return null
  }
  return {
    role: role.role,
    agent: preset.agent,
    ...(preset.model ? { model: preset.model } : {}),
    ...(preset.extraOptions ? { extraOptions: preset.extraOptions } : {}),
    token: `@${preset.id}`
  }
}
