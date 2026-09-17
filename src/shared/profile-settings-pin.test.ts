import { describe, expect, it } from 'vitest'
import { getDefaultSettings } from './constants'
import type { TuiAgent } from './types'
import {
  applyProfileSettingsPin,
  mergeProfileSettingsPin,
  pickPinnedProfileSettings,
  pinTouchedBySettingsUpdate
} from './profile-settings-pin'

describe('profile settings pin', () => {
  it('restores pinned agent settings over a later dump', () => {
    const settings = {
      ...getDefaultSettings('/tmp'),
      defaultTuiAgent: 'claude' as const,
      experimentalNativeChat: false,
      disabledTuiAgents: ['cursor'] as TuiAgent[]
    }
    const pin = pickPinnedProfileSettings({
      ...settings,
      defaultTuiAgent: 'cursor',
      experimentalNativeChat: true,
      openAgentTabsInChatByDefault: true,
      disabledTuiAgents: []
    })
    const restored = applyProfileSettingsPin(settings, pin)
    expect(restored.defaultTuiAgent).toBe('cursor')
    expect(restored.experimentalNativeChat).toBe(true)
    expect(restored.openAgentTabsInChatByDefault).toBe(true)
    expect(restored.disabledTuiAgents).toEqual([])
  })

  it('updates only the keys the user changed', () => {
    const settings = {
      ...getDefaultSettings('/tmp'),
      defaultTuiAgent: 'opencode' as const,
      experimentalNativeChat: true
    }
    const pin = { defaultTuiAgent: 'cursor' as const, experimentalNativeChat: true }
    expect(pinTouchedBySettingsUpdate({ theme: 'dark' })).toBe(false)
    expect(mergeProfileSettingsPin(pin, settings, { defaultTuiAgent: 'opencode' })).toEqual({
      defaultTuiAgent: 'opencode',
      experimentalNativeChat: true
    })
  })
})
