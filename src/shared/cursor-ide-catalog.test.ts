import { describe, expect, it } from 'vitest'
import {
  listCursorAccountCatalogModels,
  parseCursorCliConfigCatalog,
  preferCursorIdeCliModels,
  resolveCursorCatalogModel,
  resolveEnabledCursorCliModels
} from './cursor-ide-catalog'

describe('cursor IDE catalog', () => {
  it('maps grok catalog ids onto cursor agent CLI ids', () => {
    expect(
      resolveCursorCatalogModel(
        'grok-4.6',
        [
          { id: 'effort', value: 'high' },
          { id: 'fast', value: 'false' }
        ],
        ['cursor-grok-4.6-high', 'cursor-grok-4.6-high-fast', 'composer-2.5']
      )
    ).toBe('cursor-grok-4.6-high')
  })

  it('keeps catalog ids that are already CLI ids', () => {
    expect(
      resolveCursorCatalogModel('composer-2.5', [], ['composer-2.5', 'composer-2.5-fast'])
    ).toBe('composer-2.5')
  })

  it('parses cli-config history and parameters', () => {
    const catalog = parseCursorCliConfigCatalog({
      modelParameters: {
        'grok-4.6': [{ id: 'effort', value: 'high' }]
      },
      selectedModel: { modelId: 'composer-2.5', parameters: [] },
      modelSelectionHistory: ['muse-spark-1.3', 'auto']
    })
    expect(catalog.map(({ id }) => id).sort()).toEqual([
      'composer-2.5',
      'grok-4.6',
      'muse-spark-1.3'
    ])
  })

  it('resolves enabled CLI models and surfaces them ahead of the rest', () => {
    const enabled = resolveEnabledCursorCliModels(
      [
        { id: 'grok-4.6', parameters: [{ id: 'effort', value: 'high' }] },
        { id: 'composer-2.5', parameters: [] }
      ],
      ['auto', 'cursor-grok-4.6-high', 'composer-2.5', 'gpt-5.2']
    )
    expect(enabled).toEqual(['cursor-grok-4.6-high', 'composer-2.5'])
    expect(
      preferCursorIdeCliModels(
        [{ id: 'auto' }, { id: 'gpt-5.2' }, { id: 'composer-2.5' }, { id: 'cursor-grok-4.6-high' }],
        enabled
      ).map(({ id }) => id)
    ).toEqual(['auto', 'cursor-grok-4.6-high', 'composer-2.5', 'gpt-5.2'])
  })

  it('lists the full account CLI catalog with IDE-enabled models first', () => {
    expect(
      listCursorAccountCatalogModels(
        ['auto', 'gpt-5.2', 'composer-2.5', 'cursor-grok-4.6-high', 'default'],
        ['cursor-grok-4.6-high', 'composer-2.5']
      ).map(({ id }) => id)
    ).toEqual(['auto', 'cursor-grok-4.6-high', 'composer-2.5', 'gpt-5.2'])
  })
})
