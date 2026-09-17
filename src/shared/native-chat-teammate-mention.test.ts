import { describe, expect, it } from 'vitest'
import {
  buildTeammateMentionCatalog,
  buildTeammateTaskSpec,
  excerptNativeChatLeadContext,
  extractTeammateMention,
  filterTeammateMentions,
  isFileLikeMentionQuery,
  parseTeammateMentionToken
} from './native-chat-teammate-mention'
import type { NativeChatMessage } from './native-chat-types'

describe('isFileLikeMentionQuery', () => {
  it('treats paths and extensions as files', () => {
    expect(isFileLikeMentionQuery('src/foo.ts')).toBe(true)
    expect(isFileLikeMentionQuery('./bar')).toBe(true)
    expect(isFileLikeMentionQuery('/home/iaan')).toBe(true)
  })

  it('treats agent tokens as teammates', () => {
    expect(isFileLikeMentionQuery('cursor')).toBe(false)
    expect(isFileLikeMentionQuery('cursor/cursor-grok-4.6-high')).toBe(false)
    expect(isFileLikeMentionQuery('opencode/opencode-go/kimi-k3')).toBe(false)
  })
})

describe('parseTeammateMentionToken', () => {
  it('parses agent and optional model', () => {
    expect(parseTeammateMentionToken('@cursor')).toEqual({ agent: 'cursor' })
    expect(parseTeammateMentionToken('codex/gpt-6-astra')).toEqual({
      agent: 'codex',
      model: 'gpt-6-astra'
    })
  })

  it('rejects unknown agents', () => {
    expect(parseTeammateMentionToken('@src/foo.ts')).toBeNull()
    expect(parseTeammateMentionToken('@pi')).toEqual({ agent: 'pi' })
  })
})

describe('extractTeammateMention', () => {
  it('strips the mention and keeps the instruction for the teammate', () => {
    expect(extractTeammateMention('@cursor/cursor-grok-4.6-high review the diff')).toEqual({
      agent: 'cursor',
      model: 'cursor-grok-4.6-high',
      token: '@cursor/cursor-grok-4.6-high',
      instruction: 'review the diff'
    })
  })

  it('keeps preceding text out of the teammate instruction', () => {
    const parsed = extractTeammateMention('context above @opencode/opencode-go/kimi-k3 summarize')
    expect(parsed).toMatchObject({
      agent: 'opencode',
      model: 'opencode-go/kimi-k3',
      instruction: 'context above summarize'
    })
  })

  it('ignores file mentions', () => {
    expect(extractTeammateMention('look at @src/foo.ts')).toBeNull()
    expect(extractTeammateMention('email me@example.com')).toBeNull()
  })
})

describe('buildTeammateMentionCatalog', () => {
  it('lists detected agents then live models before seed models', () => {
    const catalog = buildTeammateMentionCatalog({
      detectedAgents: ['cursor', 'opencode'],
      discoveredModelsByAgent: {
        cursor: [{ id: 'cursor-grok-4.6-high', label: 'Grok 4.6' }]
      }
    })
    expect(catalog.some((row) => row.token === '@cursor')).toBe(true)
    expect(catalog.some((row) => row.token === '@claude')).toBe(false)
    expect(catalog.find((row) => row.model === 'cursor-grok-4.6-high')?.label).toBe('Grok 4.6')
    expect(catalog.some((row) => row.token === '@opencode')).toBe(true)
  })
})

describe('filterTeammateMentions', () => {
  const options = [
    { agent: 'cursor' as const, label: 'cursor', token: '@cursor' },
    {
      agent: 'cursor' as const,
      model: 'cursor-grok-4.6-high',
      label: 'Grok 4.6',
      token: '@cursor/cursor-grok-4.6-high'
    },
    { agent: 'codex' as const, label: 'codex', token: '@codex' }
  ]

  it('shows agent rows and named presets until a query is typed', () => {
    const preset = {
      agent: 'cursor' as const,
      model: 'cursor-grok-4.6-high',
      label: 'Grok 4.6 High',
      token: '@grok-high',
      kind: 'preset' as const
    }
    expect(filterTeammateMentions([...options, preset], '')).toEqual([
      options[0],
      options[2],
      preset
    ])
  })

  it('matches agent and model tokens', () => {
    expect(filterTeammateMentions(options, 'grok').map((row) => row.token)).toEqual([
      '@cursor/cursor-grok-4.6-high'
    ])
  })
})

describe('excerptNativeChatLeadContext', () => {
  it('joins recent user and assistant text turns', () => {
    const messages: NativeChatMessage[] = [
      {
        id: '1',
        role: 'user',
        timestamp: 1,
        source: 'transcript',
        blocks: [{ type: 'text', text: 'plan the team' }]
      },
      {
        id: '2',
        role: 'assistant',
        timestamp: 2,
        source: 'transcript',
        blocks: [{ type: 'text', text: 'I will wait for the teammate.' }]
      }
    ]
    expect(excerptNativeChatLeadContext(messages)).toContain('user: plan the team')
    expect(excerptNativeChatLeadContext(messages)).toContain(
      'assistant: I will wait for the teammate.'
    )
  })
})

describe('buildTeammateTaskSpec', () => {
  it('tells the worker the lead is not executing the task', () => {
    const spec = buildTeammateTaskSpec({
      instruction: 'scan ~/.claude',
      context: 'user: design teammate dispatch',
      agent: 'cursor',
      model: 'cursor-grok-4.6-high'
    })
    expect(spec).toContain('Lead session context')
    expect(spec).toContain('they are not doing this task')
    expect(spec).toContain('scan ~/.claude')
    expect(spec).toContain('cursor-grok-4.6-high')
  })
})
