import type { GlobalSettings } from './types'

export const PROFILE_SETTINGS_PIN_KEYS = [
  'defaultTuiAgent',
  'experimentalNativeChat',
  'openAgentTabsInChatByDefault',
  'claudeAgentTeamsMode',
  'disabledTuiAgents',
  'nativeChatSessionOptions',
  'nativeChatTeammate',
  'agentCmdOverrides'
] as const

export type ProfileSettingsPinKey = (typeof PROFILE_SETTINGS_PIN_KEYS)[number]

export type ProfileSettingsPin = Partial<Pick<GlobalSettings, ProfileSettingsPinKey>>

const PIN_KEY_SET = new Set<string>(PROFILE_SETTINGS_PIN_KEYS)

export function isProfileSettingsPinKey(key: string): key is ProfileSettingsPinKey {
  return PIN_KEY_SET.has(key)
}

export function pickPinnedProfileSettings(settings: GlobalSettings): ProfileSettingsPin {
  const pin: ProfileSettingsPin = {}
  for (const key of PROFILE_SETTINGS_PIN_KEYS) {
    const value = settings[key]
    if (value !== undefined) {
      pin[key] = cloneJson(value) as never
    }
  }
  return pin
}

export function applyProfileSettingsPin(
  settings: GlobalSettings,
  pin: ProfileSettingsPin | null | undefined
): GlobalSettings {
  if (!pin || Object.keys(pin).length === 0) {
    return settings
  }
  let changed = false
  const next: GlobalSettings = { ...settings }
  for (const key of PROFILE_SETTINGS_PIN_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(pin, key) || pin[key] === undefined) {
      continue
    }
    const pinned = cloneJson(pin[key])
    if (!jsonEqual(next[key], pinned)) {
      next[key] = pinned as never
      changed = true
    }
  }
  return changed ? next : settings
}

export function pinTouchedBySettingsUpdate(updates: Partial<GlobalSettings>): boolean {
  return PROFILE_SETTINGS_PIN_KEYS.some((key) => key in updates)
}

export function mergeProfileSettingsPin(
  pin: ProfileSettingsPin,
  settings: GlobalSettings,
  updates: Partial<GlobalSettings>
): ProfileSettingsPin {
  if (!pinTouchedBySettingsUpdate(updates)) {
    return pin
  }
  const next: ProfileSettingsPin = { ...pin }
  for (const key of PROFILE_SETTINGS_PIN_KEYS) {
    if (key in updates) {
      const value = settings[key]
      if (value === undefined) {
        delete next[key]
      } else {
        next[key] = cloneJson(value) as never
      }
    }
  }
  return next
}

export function sanitizeProfileSettingsPin(value: unknown): ProfileSettingsPin {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const pin: ProfileSettingsPin = {}
  for (const [key, entry] of Object.entries(value)) {
    if (!isProfileSettingsPinKey(key) || entry === undefined) {
      continue
    }
    pin[key] = cloneJson(entry) as never
  }
  return pin
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
