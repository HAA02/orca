import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NATIVE_CHAT_TEAMMATE_SETTINGS,
  extractResolvedTeammateMention,
  listTeammateLaunchAttempts,
  mergeTeammateMentionCatalog,
  normalizeNativeChatTeammateSettings,
  teammateDispatchJobs
} from './native-chat-teammate-presets'
import { buildTeammateMentionCatalog } from './native-chat-teammate-mention'

describe('extractResolvedTeammateMention', () => {
  const settings = DEFAULT_NATIVE_CHAT_TEAMMATE_SETTINGS

  it('resolves named bot aliases to the mapped CLI and model', () => {
    expect(extractResolvedTeammateMention('@grok-high review the diff', settings)).toEqual({
      agent: 'cursor',
      model: 'cursor-grok-4.6-high',
      token: '@grok-high',
      instruction: 'review the diff'
    })
  })

  it('keeps explicit @agent/model mentions', () => {
    expect(
      extractResolvedTeammateMention('@opencode/opencode-go/kimi-k3 summarize', settings)
    ).toMatchObject({
      agent: 'opencode',
      model: 'opencode-go/kimi-k3',
      instruction: 'summarize'
    })
  })

  it('expands @mixed-team into role members', () => {
    const parsed = extractResolvedTeammateMention('@mixed-team ship the auth refactor', settings)
    expect(parsed?.token).toBe('@mixed-team')
    expect(parsed?.members?.map((member) => member.role)).toEqual(['pm', 'implement', 'review'])
    expect(teammateDispatchJobs(parsed!).map((job) => job.agent)).toEqual([
      'cursor',
      'opencode',
      'codex'
    ])
  })
})

describe('mergeTeammateMentionCatalog', () => {
  it('puts named bots ahead of raw agent rows', () => {
    const catalog = mergeTeammateMentionCatalog(
      buildTeammateMentionCatalog({ detectedAgents: ['cursor', 'opencode', 'codex'] }),
      DEFAULT_NATIVE_CHAT_TEAMMATE_SETTINGS,
      ['cursor', 'opencode', 'codex']
    )
    expect(catalog[0]?.token).toBe('@grok-high')
    expect(catalog.some((row) => row.token === '@mixed-team')).toBe(true)
    expect(catalog.some((row) => row.token === '@cursor')).toBe(true)
  })
})

describe('listTeammateLaunchAttempts', () => {
  it('appends OpenCode after a Cursor mention when fallback is on', () => {
    const attempts = listTeammateLaunchAttempts(
      {
        agent: 'cursor',
        model: 'cursor-grok-4.6-high',
        token: '@grok-high',
        instruction: 'review'
      },
      DEFAULT_NATIVE_CHAT_TEAMMATE_SETTINGS
    )
    expect(attempts.map((row) => row.agent)).toEqual(['cursor', 'opencode'])
  })

  it('does not duplicate OpenCode when that agent was mentioned', () => {
    const attempts = listTeammateLaunchAttempts(
      { agent: 'opencode', token: '@opencode', instruction: 'review' },
      DEFAULT_NATIVE_CHAT_TEAMMATE_SETTINGS
    )
    expect(attempts.map((row) => row.agent)).toEqual(['opencode'])
  })
})

describe('normalizeNativeChatTeammateSettings', () => {
  it('rejects preset ids that collide with CLI agent names', () => {
    const normalized = normalizeNativeChatTeammateSettings({
      presets: [{ id: 'cursor', label: 'Nope', agent: 'cursor', model: 'x' }],
      maxConcurrent: 99,
      fallbackEnabled: false
    })
    expect(normalized.presets.some((preset) => preset.id === 'cursor')).toBe(false)
    expect(normalized.maxConcurrent).toBe(12)
    expect(normalized.fallbackEnabled).toBe(false)
  })
})
