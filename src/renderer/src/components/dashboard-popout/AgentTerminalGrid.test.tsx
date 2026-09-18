// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { DashboardCard, DashboardSnapshot } from '../../../../shared/dashboard-snapshot'
import { AgentTerminalGrid } from './AgentTerminalGrid'

// Stub the xterm-backed preview so the grid test exercises filtering and
// layout wiring without a real terminal.
vi.mock('./AgentTerminalPreview', () => ({
  AgentTerminalPreview: ({ ptyId }: { ptyId: string }) => (
    <div data-testid="terminal-preview" data-pty-id={ptyId} />
  )
}))

function card(overrides: Partial<DashboardCard>): DashboardCard {
  return {
    paneKey: Math.random().toString(36),
    ptyId: 'p1',
    agentType: 'claude',
    bucket: 'working',
    dotState: 'working',
    task: 't',
    repoId: 'r1',
    worktreeId: 'w1',
    tabId: 'tab1',
    leafId: 'l1',
    repoName: 'Repo',
    worktreeName: 'wt',
    startedAt: 0,
    finishedAt: null,
    stateChangedAt: 0,
    unseen: false,
    ...overrides
  }
}

function renderGrid(cards: DashboardCard[]): { onShowKanban: ReturnType<typeof vi.fn> } {
  const snapshot: DashboardSnapshot = { generatedAt: 1, cards }
  const onShowKanban = vi.fn()
  render(<AgentTerminalGrid snapshot={snapshot} onShowKanban={onShowKanban} />)
  return { onShowKanban }
}

const revealAgent = vi.fn(async () => {})

describe('AgentTerminalGrid', () => {
  beforeEach(() => {
    ;(window as unknown as { api: unknown }).api = { dashboard: { revealAgent } }
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('tiles only live working/attention CLIs', () => {
    renderGrid([
      card({ bucket: 'working', worktreeName: 'w1' }),
      card({ bucket: 'attention', worktreeName: 'a1' }),
      card({ bucket: 'idle', worktreeName: 'i1' }),
      card({ bucket: 'working', ptyId: null, worktreeName: 'gone' })
    ])
    const tiles = screen.getAllByTestId('terminal-tile')
    expect(tiles).toHaveLength(2)
    expect(screen.getAllByTestId('terminal-preview')).toHaveLength(2)
    expect(screen.getByText('2 running')).toBeTruthy()
    expect(screen.queryByText('i1')).toBeNull()
    expect(screen.queryByText('gone')).toBeNull()
  })

  it('shows the empty state when nothing is running', () => {
    renderGrid([card({ bucket: 'idle' }), card({ bucket: 'working', ptyId: null })])
    expect(screen.queryAllByTestId('terminal-tile')).toHaveLength(0)
    expect(screen.getByText(/No running CLIs/)).toBeTruthy()
  })

  it('switches back to the board from the toggle', () => {
    const { onShowKanban } = renderGrid([card({ bucket: 'working' })])
    fireEvent.click(screen.getByLabelText('Board'))
    expect(onShowKanban).toHaveBeenCalledTimes(1)
  })

  it('reveals the worktree from a tile header', () => {
    const agent = card({
      bucket: 'working',
      repoId: 'repo-9',
      worktreeId: 'wt-9',
      tabId: 'tab-9',
      leafId: 'leaf-9'
    })
    renderGrid([agent])
    fireEvent.click(screen.getAllByLabelText('Open worktree')[0])
    expect(revealAgent).toHaveBeenCalledWith({
      repoId: 'repo-9',
      worktreeId: 'wt-9',
      tabId: 'tab-9',
      leafId: 'leaf-9'
    })
  })
})
