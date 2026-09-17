import { describe, expect, it } from 'vitest'
import {
  getAgentSessionOptionCatalog,
  mergeCatalogModels,
  mergeCatalogModelsLiveFirst
} from './agent-session-option-catalog'
import { OPENCODE_DEFAULT_MODEL_ID } from './agent-session-option-catalog-opencode'
import { resolveAgentSessionOptionLaunch } from './agent-session-option-launch'
import {
  resolveNativeChatSessionOptionDefaults,
  updateNativeChatSessionOptionDefaults
} from './native-chat-session-option-defaults'

describe('agent session option catalog', () => {
  it('returns no catalog for unknown agents', () => {
    expect(getAgentSessionOptionCatalog('future-agent')).toBeNull()
  })

  it('keeps Claude option sets model-scoped', () => {
    const catalog = getAgentSessionOptionCatalog('claude')
    expect(
      catalog?.models.find((model) => model.id === 'opus')?.options.map(({ id }) => id)
    ).toEqual(['effort', 'fastMode'])
    expect(catalog?.models.find((model) => model.id === 'haiku')?.options).toEqual([])
  })

  it('merges discovered labels while preserving cataloged option shapes', () => {
    const seed = getAgentSessionOptionCatalog('cursor')!.models
    const merged = mergeCatalogModels(seed, [
      { id: 'gpt-5.3-codex', label: 'GPT 5.3 (live)', options: [] },
      { id: 'new-account-model', label: 'new-account-model', options: [] }
    ])
    expect(merged.find((model) => model.id === 'gpt-5.3-codex')).toMatchObject({
      label: 'GPT 5.3 (live)',
      options: expect.arrayContaining([expect.objectContaining({ id: 'effort' })])
    })
    expect(merged.at(-1)).toEqual({
      id: 'new-account-model',
      label: 'new-account-model',
      options: []
    })
  })

  it('keeps live Cursor/OpenCode discovery order ahead of unused seed rows', () => {
    const seed = getAgentSessionOptionCatalog('cursor')!.models
    const merged = mergeCatalogModelsLiveFirst(seed, [
      { id: 'cursor-grok-4.6-high', label: 'Grok 4.6', options: [] },
      { id: 'auto', label: 'Auto (live)', options: [] }
    ])
    expect(merged.map(({ id }) => id).slice(0, 2)).toEqual(['cursor-grok-4.6-high', 'auto'])
    expect(merged.find((model) => model.id === 'auto')).toMatchObject({ label: 'Auto (live)' })
  })

  it('discovers Codex subscription models from `codex debug models` JSON', () => {
    const catalog = getAgentSessionOptionCatalog('codex')
    expect(catalog?.listModels?.command).toBe('codex debug models')
    const parsed = catalog?.listModels?.parse(
      JSON.stringify({
        models: [
          {
            slug: 'gpt-6-astra',
            display_name: 'GPT-6 Astra',
            supported_reasoning_levels: [{ effort: 'xhigh' }],
            default_reasoning_level: 'xhigh'
          }
        ]
      })
    )
    expect(parsed?.[0]).toMatchObject({ id: 'gpt-6-astra', label: 'GPT-6 Astra' })
    expect(parsed?.[0]?.options.some((option) => option.id === 'effort')).toBe(true)
  })

  it('parses Cursor model discovery without treating headings as models', () => {
    const parsed = getAgentSessionOptionCatalog('cursor')!.listModels!.parse(
      'Available models:\n- auto (default)\n- gpt-5.3-codex\nmodels\n'
    )
    expect(parsed.map(({ id }) => id)).toEqual(['auto', 'gpt-5.3-codex'])
  })

  it('parses Cursor CLI id-dash-label rows from cursor agent --list-models', () => {
    const parsed = getAgentSessionOptionCatalog('cursor')!.listModels!.parse(
      'Available models:\nauto - Auto (default)\ncursor-grok-4.6-high - Grok 4.6\n'
    )
    expect(parsed.map(({ id, label }) => [id, label])).toEqual([
      ['auto', 'Auto'],
      ['cursor-grok-4.6-high', 'Grok 4.6']
    ])
  })

  it('exposes OpenCode Go models in the session catalog', () => {
    const catalog = getAgentSessionOptionCatalog('opencode')
    expect(catalog?.models.map(({ id }) => id)).toContain('opencode-go/kimi-k3')
    expect(
      catalog?.listModels?.parse('opencode-go/kimi-k3\nopencode-go/glm-5.2\n').map(({ id }) => id)
    ).toEqual(['opencode-go/kimi-k3', 'opencode-go/glm-5.2'])
    expect(
      resolveAgentSessionOptionLaunch('opencode', { model: 'opencode-go/kimi-k3' }).args
    ).toEqual(['--model', 'opencode-go/kimi-k3'])
  })

  it('pins opencode to its catalog default model before any user selection', () => {
    const defaults = resolveNativeChatSessionOptionDefaults({}, 'opencode')
    expect(defaults).toEqual({ model: OPENCODE_DEFAULT_MODEL_ID })
    expect(resolveAgentSessionOptionLaunch('opencode', defaults)).toEqual({
      args: ['--model', OPENCODE_DEFAULT_MODEL_ID],
      appliedValues: { model: OPENCODE_DEFAULT_MODEL_ID }
    })
  })

  it('lets an explicit opencode selection override the pinned default', () => {
    const persisted = updateNativeChatSessionOptionDefaults({
      persisted: undefined,
      agent: 'opencode',
      modelId: 'opencode-go/kimi-k3',
      optionId: 'model',
      value: 'opencode-go/kimi-k3'
    })
    expect(resolveNativeChatSessionOptionDefaults(persisted, 'opencode')).toEqual({
      model: 'opencode-go/kimi-k3'
    })
  })

  it('composes Cursor effort and fast mode into the supported slug form', () => {
    const resolved = resolveAgentSessionOptionLaunch('cursor', {
      model: 'gpt-5.3-codex',
      effort: 'high',
      fastMode: true
    })
    expect(resolved.args).toEqual(['--model', 'gpt-5.3-codex-high-fast'])
    expect(resolved.appliedValues).toEqual({
      model: 'gpt-5.3-codex',
      effort: 'high',
      fastMode: true
    })
  })

  it('passes unknown model and option values through launch mappings', () => {
    expect(
      resolveAgentSessionOptionLaunch('claude', {
        model: 'claude-future',
        effort: 'future-effort'
      })
    ).toEqual({ args: ['--model', 'claude-future'], appliedValues: { model: 'claude-future' } })
    expect(
      resolveAgentSessionOptionLaunch('claude', { model: 'opus', effort: 'future-effort' })
    ).toMatchObject({
      args: ['--model', 'opus', '--effort', 'future-effort'],
      appliedValues: { model: 'opus', effort: 'future-effort' }
    })
  })

  it('resolves only stored values without leaking values across models', () => {
    let persisted = updateNativeChatSessionOptionDefaults({
      persisted: undefined,
      agent: 'claude',
      modelId: 'opus',
      optionId: 'model',
      value: 'opus'
    })
    persisted = updateNativeChatSessionOptionDefaults({
      persisted,
      agent: 'claude',
      modelId: 'opus',
      optionId: 'effort',
      value: 'xhigh'
    })
    persisted = updateNativeChatSessionOptionDefaults({
      persisted,
      agent: 'claude',
      modelId: 'sonnet',
      optionId: 'model',
      value: 'sonnet'
    })

    expect(resolveNativeChatSessionOptionDefaults(persisted, 'claude')).toEqual({
      model: 'sonnet'
    })
    expect(persisted.claude?.valuesByModel?.opus).toEqual({ effort: 'xhigh' })
  })

  it('spawns vanilla when the user has not explicitly selected a model', () => {
    // Regression (#9085): a fresh launch must not force the catalog default
    // model/effort — the agent must spawn exactly as its own CLI would. Only
    // catalogs that opt in via launchDefaultModel are exempt (see opencode).
    expect(resolveNativeChatSessionOptionDefaults(undefined, 'claude')).toBeUndefined()
    expect(resolveNativeChatSessionOptionDefaults({}, 'claude')).toBeUndefined()
    expect(resolveNativeChatSessionOptionDefaults({}, 'future-agent')).toBeUndefined()
    expect(
      resolveNativeChatSessionOptionDefaults({}, 'claude', { model: 'cursor-grok-4.6-high' })
    ).toEqual({ model: 'cursor-grok-4.6-high' })
  })

  it('resolves an explicitly selected model and only its stored options', () => {
    let persisted = updateNativeChatSessionOptionDefaults({
      persisted: undefined,
      agent: 'claude',
      modelId: 'opus',
      optionId: 'model',
      value: 'opus'
    })
    expect(resolveNativeChatSessionOptionDefaults(persisted, 'claude')).toEqual({
      model: 'opus'
    })
    persisted = updateNativeChatSessionOptionDefaults({
      persisted,
      agent: 'claude',
      modelId: 'opus',
      optionId: 'effort',
      value: 'xhigh'
    })
    expect(resolveNativeChatSessionOptionDefaults(persisted, 'claude')).toEqual({
      model: 'opus',
      effort: 'xhigh'
    })
  })

  it('keeps catalog option defaults after the user explicitly selects a model', () => {
    const persisted = updateNativeChatSessionOptionDefaults({
      persisted: undefined,
      agent: 'claude',
      modelId: 'sonnet',
      optionId: 'model',
      value: 'sonnet'
    })
    const defaults = resolveNativeChatSessionOptionDefaults(persisted, 'claude')

    expect(resolveAgentSessionOptionLaunch('claude', defaults)).toEqual({
      args: ['--model', 'sonnet', '--effort', 'high'],
      appliedValues: { model: 'sonnet', effort: 'high' }
    })
  })
})
