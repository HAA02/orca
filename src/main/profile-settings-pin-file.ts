import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import {
  applyProfileSettingsPin,
  mergeProfileSettingsPin,
  pickPinnedProfileSettings,
  pinTouchedBySettingsUpdate,
  sanitizeProfileSettingsPin,
  type ProfileSettingsPin
} from '../shared/profile-settings-pin'
import type { GlobalSettings } from '../shared/types'

export const PROFILE_SETTINGS_PIN_FILENAME = 'profile-settings-pin.json'

export function profileSettingsPinPath(dataFile: string): string {
  return join(dirname(dataFile), PROFILE_SETTINGS_PIN_FILENAME)
}

export function readProfileSettingsPin(dataFile: string): ProfileSettingsPin | null {
  const path = profileSettingsPinPath(dataFile)
  if (!existsSync(path)) {
    return null
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as unknown
    const pin = sanitizeProfileSettingsPin(parsed)
    return Object.keys(pin).length > 0 ? pin : null
  } catch {
    return null
  }
}

export function writeProfileSettingsPin(dataFile: string, pin: ProfileSettingsPin): void {
  const path = profileSettingsPinPath(dataFile)
  mkdirSync(dirname(path), { recursive: true })
  const tempPath = `${path}.${process.pid}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(pin, null, 2)}\n`, 'utf-8')
  renameSync(tempPath, path)
}

export function restorePinnedProfileSettings(
  dataFile: string,
  settings: GlobalSettings
): { settings: GlobalSettings; changed: boolean } {
  const existing = readProfileSettingsPin(dataFile)
  if (!existing) {
    writeProfileSettingsPin(dataFile, pickPinnedProfileSettings(settings))
    return { settings, changed: false }
  }
  const next = applyProfileSettingsPin(settings, existing)
  return { settings: next, changed: next !== settings }
}

export function syncProfileSettingsPin(
  dataFile: string,
  settings: GlobalSettings,
  updates: Partial<GlobalSettings>
): void {
  if (!pinTouchedBySettingsUpdate(updates)) {
    return
  }
  const existing = readProfileSettingsPin(dataFile) ?? pickPinnedProfileSettings(settings)
  const next = mergeProfileSettingsPin(existing, settings, updates)
  writeProfileSettingsPin(dataFile, next)
}

export function removeProfileSettingsPinForTests(dataFile: string): void {
  const path = profileSettingsPinPath(dataFile)
  if (existsSync(path)) {
    unlinkSync(path)
  }
}
