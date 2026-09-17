// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'

import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getStatus: vi.fn()
}))

vi.mock('@/lib/agent-catalog', () => ({
  AgentIcon: () => React.createElement('span', { 'data-testid': 'cursor-icon' })
}))

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string) => fallback
}))

import { CursorAccountsSection } from './CursorAccountsSection'

describe('CursorAccountsSection', () => {
  beforeEach(() => {
    mocks.getStatus.mockResolvedValue({
      signedIn: false,
      email: null,
      displayName: null,
      authSource: null,
      cursorOnPath: true,
      cursorAgentOnPath: false,
      error: null
    })
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { cursorAccounts: { getStatus: mocks.getStatus } }
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('tells the user to run cursor agent login when Cursor is on PATH', async () => {
    render(<CursorAccountsSection sessionCookie="" updateSettings={vi.fn()} />)
    expect(
      await screen.findByText(
        'In a terminal, run cursor agent login, then click Refresh status here.'
      )
    ).toBeInTheDocument()
  })

  it('stores the usage cookie and offers to clear it once set', async () => {
    const updateSettings = vi.fn()
    const { rerender } = render(
      <CursorAccountsSection sessionCookie="" updateSettings={updateSettings} />
    )

    const input = screen.getByPlaceholderText('WorkosCursorSessionToken=…')
    fireEvent.change(input, { target: { value: 'tok' } })
    expect(updateSettings).toHaveBeenCalledWith({ cursorSessionCookie: 'tok' })
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()

    rerender(<CursorAccountsSection sessionCookie="tok" updateSettings={updateSettings} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(updateSettings).toHaveBeenCalledWith({ cursorSessionCookie: '' })
  })
})
