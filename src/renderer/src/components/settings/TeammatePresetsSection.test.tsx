// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'

import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDefaultSettings } from '../../../../shared/constants'
import { TeammatePresetsSection } from './TeammatePresetsSection'

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string, vars?: Record<string, string>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => vars?.[name] ?? '')
}))

vi.mock('./SearchableSetting', () => ({
  SearchableSetting: ({ children, title }: { children: React.ReactNode; title: React.ReactNode }) =>
    React.createElement('section', null, title, children)
}))

vi.mock('./SettingsFormControls', () => ({
  NumberField: ({ label, value }: { label: React.ReactNode; value: number }) =>
    React.createElement('div', null, label, String(value)),
  SettingsSubsectionHeader: ({ title }: { title: React.ReactNode }) =>
    React.createElement('h3', null, title),
  SettingsSwitchRow: ({ label }: { label: React.ReactNode }) =>
    React.createElement('div', null, label)
}))

describe('TeammatePresetsSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows default named bots including grok-high', () => {
    const updateSettings = vi.fn()
    render(
      <TeammatePresetsSection
        settings={getDefaultSettings('/tmp')}
        updateSettings={updateSettings}
      />
    )
    expect(screen.getByDisplayValue('grok-high')).toBeInTheDocument()
    expect(screen.getByText(/@mixed-team/)).toBeInTheDocument()
  })
})
