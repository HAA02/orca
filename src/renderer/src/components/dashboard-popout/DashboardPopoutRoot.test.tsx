// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DashboardPopoutRoot } from './DashboardPopoutRoot'

// Stub the views so the root test only covers view selection, not xterm/Radix.
vi.mock('./useDashboardSnapshot', () => ({
  useDashboardSnapshot: () => ({ generatedAt: 0, cards: [] })
}))
vi.mock('./AgentKanbanBoard', () => ({
  AgentKanbanBoard: ({ onShowSplit }: { onShowSplit?: () => void }) => (
    <button data-testid="board" onClick={onShowSplit} />
  )
}))
vi.mock('./AgentTerminalGrid', () => ({
  AgentTerminalGrid: ({ onShowKanban }: { onShowKanban: () => void }) => (
    <button data-testid="grid" onClick={onShowKanban} />
  )
}))

describe('DashboardPopoutRoot', () => {
  afterEach(() => {
    cleanup()
  })

  it('defaults to the board and switches both ways in place', () => {
    render(<DashboardPopoutRoot view={null} />)
    expect(screen.getByTestId('board')).toBeTruthy()

    fireEvent.click(screen.getByTestId('board'))
    expect(screen.getByTestId('grid')).toBeTruthy()

    fireEvent.click(screen.getByTestId('grid'))
    expect(screen.getByTestId('board')).toBeTruthy()
  })

  it('honors ?view=split on open', () => {
    render(<DashboardPopoutRoot view="split" />)
    expect(screen.getByTestId('grid')).toBeTruthy()
    expect(screen.queryByTestId('board')).toBeNull()
  })
})
