import type React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { GlobalSettings } from '../../../../shared/types'
import {
  NATIVE_CHAT_TEAMMATE_AGENTS,
  type NativeChatTeammateAgent
} from '../../../../shared/native-chat-teammate-mention'
import {
  DEFAULT_NATIVE_CHAT_TEAMMATE_SETTINGS,
  normalizeNativeChatTeammateSettings,
  resolveNativeChatTeammateSettings,
  type NativeChatTeammatePreset,
  type NativeChatTeammateSettings
} from '../../../../shared/native-chat-teammate-presets'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SearchableSetting } from './SearchableSetting'
import { NumberField, SettingsSubsectionHeader, SettingsSwitchRow } from './SettingsFormControls'

type TeammatePresetsSectionProps = {
  settings: GlobalSettings | null
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
}

export function TeammatePresetsSection({
  settings,
  updateSettings
}: TeammatePresetsSectionProps): React.JSX.Element | null {
  if (!settings) {
    return null
  }
  const teammate = resolveNativeChatTeammateSettings(settings)
  const commit = (next: NativeChatTeammateSettings): void => {
    void updateSettings({ nativeChatTeammate: normalizeNativeChatTeammateSettings(next) })
  }

  return (
    <SearchableSetting
      title={translate('auto.components.settings.TeammatePresetsSection.title', 'Named teammates')}
      description={translate(
        'auto.components.settings.TeammatePresetsSection.description',
        'Type @grok-high or @mixed-team in native chat to spawn Cursor/OpenCode/Codex workers. The lead does not do that work.'
      )}
      keywords={['bots', 'presets', 'teammate', 'mention', 'grok', 'concurrent', 'fallback', 'pi']}
      className="space-y-4 py-2"
    >
      <SettingsSubsectionHeader
        title={translate(
          'auto.components.settings.TeammatePresetsSection.header',
          'Native chat teammates'
        )}
        description={translate(
          'auto.components.settings.TeammatePresetsSection.headerDescription',
          'Aliases are stored in Orca settings, not Hermes yaml.'
        )}
      />
      <NumberField
        label={translate(
          'auto.components.settings.TeammatePresetsSection.maxConcurrent',
          'Max concurrent teammates'
        )}
        description={translate(
          'auto.components.settings.TeammatePresetsSection.maxConcurrentDescription',
          'Caps same-worktree @mention workers. Default 5.'
        )}
        value={teammate.maxConcurrent}
        defaultValue={DEFAULT_NATIVE_CHAT_TEAMMATE_SETTINGS.maxConcurrent}
        min={1}
        max={12}
        onChange={(maxConcurrent) => commit({ ...teammate, maxConcurrent })}
      />
      <SettingsSwitchRow
        label={translate(
          'auto.components.settings.TeammatePresetsSection.fallback',
          'Fall back to OpenCode if Cursor fails to start'
        )}
        description={translate(
          'auto.components.settings.TeammatePresetsSection.fallbackDescription',
          'Closes the failed pane and retries with your OpenCode default model.'
        )}
        checked={teammate.fallbackEnabled}
        onChange={() => commit({ ...teammate, fallbackEnabled: !teammate.fallbackEnabled })}
      />
      <div className="space-y-2">
        {teammate.presets.map((preset, index) => (
          <PresetRow
            key={`${preset.id}-${index}`}
            preset={preset}
            onChange={(next) => {
              const presets = teammate.presets.slice()
              presets[index] = next
              commit({ ...teammate, presets })
            }}
            onRemove={() => {
              commit({
                ...teammate,
                presets: teammate.presets.filter((_, rowIndex) => rowIndex !== index)
              })
            }}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            commit({
              ...teammate,
              presets: [...teammate.presets, nextPreset(teammate.presets)]
            })
          }
        >
          <Plus className="size-3.5" />
          {translate('auto.components.settings.TeammatePresetsSection.add', 'Add bot')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {translate(
          'auto.components.settings.TeammatePresetsSection.roster',
          'Roster {{token}} launches {{roles}}.',
          {
            token: '@mixed-team',
            roles: teammate.roleTemplates[0]?.label ?? 'PM / implement / review'
          }
        )}
      </p>
    </SearchableSetting>
  )
}

function PresetRow(args: {
  preset: NativeChatTeammatePreset
  onChange: (preset: NativeChatTeammatePreset) => void
  onRemove: () => void
}): React.JSX.Element {
  const { preset, onChange, onRemove } = args
  return (
    <div className="grid grid-cols-[7rem_1fr_7rem_minmax(0,1fr)_auto] items-center gap-2">
      <Input
        value={preset.id}
        aria-label={translate('auto.components.settings.TeammatePresetsSection.id', 'Bot id')}
        onChange={(event) => onChange({ ...preset, id: event.target.value.trim().toLowerCase() })}
      />
      <Input
        value={preset.label}
        aria-label={translate('auto.components.settings.TeammatePresetsSection.label', 'Label')}
        onChange={(event) => onChange({ ...preset, label: event.target.value })}
      />
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        value={preset.agent}
        aria-label={translate('auto.components.settings.TeammatePresetsSection.agent', 'Agent')}
        onChange={(event) =>
          onChange({ ...preset, agent: event.target.value as NativeChatTeammateAgent })
        }
      >
        {NATIVE_CHAT_TEAMMATE_AGENTS.map((agent) => (
          <option key={agent} value={agent}>
            {agent}
          </option>
        ))}
      </select>
      <Input
        value={preset.model ?? ''}
        aria-label={translate('auto.components.settings.TeammatePresetsSection.model', 'Model')}
        onChange={(event) => {
          const model = event.target.value.trim()
          onChange(
            model
              ? { ...preset, model }
              : { id: preset.id, label: preset.label, agent: preset.agent }
          )
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={translate(
          'auto.components.settings.TeammatePresetsSection.removeBot',
          'Remove bot'
        )}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

function nextPreset(presets: readonly NativeChatTeammatePreset[]): NativeChatTeammatePreset {
  const used = new Set(presets.map((preset) => preset.id))
  let index = presets.length + 1
  let id = `bot-${index}`
  while (used.has(id)) {
    index += 1
    id = `bot-${index}`
  }
  return { id, label: id, agent: 'cursor' }
}
