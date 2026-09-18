import { useCallback } from 'react'
import { MessageCircleQuestion, SquareArrowOutUpRight } from 'lucide-react'
import { AgentIcon } from '@/lib/agent-catalog'
import { agentTypeToIconAgent } from '@/lib/agent-status'
import { AgentStateDot } from '@/components/AgentStateDot'
import { translate } from '@/i18n/i18n'
import type { DashboardCard, DashboardSnapshot } from '../../../../shared/dashboard-snapshot'
import { AgentTerminalPreview } from './AgentTerminalPreview'
import { DashboardViewToggle } from './DashboardViewToggle'

/** The split view only tiles live CLIs the user is actively running — idle and
 *  finished rows belong on the board, not in a wall of terminals. */
function isRunningCliCard(card: DashboardCard): boolean {
  return card.ptyId !== null && (card.bucket === 'working' || card.bucket === 'attention')
}

function AgentTerminalTile({ card }: { card: DashboardCard }): React.JSX.Element {
  const reveal = useCallback(() => {
    void window.api.dashboard.revealAgent({
      repoId: card.repoId,
      worktreeId: card.worktreeId,
      tabId: card.tabId,
      leafId: card.leafId
    })
  }, [card])

  return (
    <section
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card"
      data-testid="terminal-tile"
      data-pane-key={card.paneKey}
    >
      <header className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-2.5 py-1.5">
        <AgentIcon agent={agentTypeToIconAgent(card.agentType)} size={13} />
        <span className="truncate text-[12px] font-medium">{card.worktreeName}</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {card.repoName}
        </span>
        <AgentStateDot state={card.dotState} className="ml-auto" />
        <button
          type="button"
          onClick={reveal}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={translate('dashboardPopout.terminal.focusWorktree', 'Open worktree')}
          title={translate('dashboardPopout.terminal.focusWorktree', 'Open worktree')}
        >
          <SquareArrowOutUpRight className="size-3.5" />
        </button>
      </header>
      {card.askSummary ? (
        <div className="flex shrink-0 items-start gap-1 border-b border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-600 dark:text-amber-400">
          <MessageCircleQuestion className="mt-px size-3 shrink-0" aria-hidden />
          <span className="line-clamp-2">{card.askSummary}</span>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        {card.ptyId ? (
          <AgentTerminalPreview ptyId={card.ptyId} heightClassName="h-full" focusOnMount={false} />
        ) : null}
      </div>
    </section>
  )
}

type AgentTerminalGridProps = {
  snapshot: DashboardSnapshot
  onShowKanban: () => void
}

/** The split-terminal view: every running CLI tiled side by side so the user can
 *  watch all of them at once instead of opening one dialog at a time. */
export function AgentTerminalGrid({
  snapshot,
  onShowKanban
}: AgentTerminalGridProps): React.JSX.Element {
  const running = snapshot.cards.filter(isRunningCliCard)

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
        <h1 className="text-[13px] font-semibold">
          {translate('dashboardPopout.title', 'Agents')}
        </h1>
        <span className="text-[11px] text-muted-foreground">
          {translate('dashboardPopout.running', '{{count}} running', { count: running.length })}
        </span>
        <DashboardViewToggle
          value="split"
          onChange={(view) => {
            if (view === 'kanban') {
              onShowKanban()
            }
          }}
          className="ml-auto"
        />
      </div>
      {running.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-[12px] text-muted-foreground">
          {translate(
            'dashboardPopout.split.empty',
            'No running CLIs — start an agent to see its terminal here.'
          )}
        </div>
      ) : (
        <div className="scrollbar-sleek grid min-h-0 flex-1 auto-rows-[320px] grid-cols-1 gap-3 overflow-y-auto p-3 sm:grid-cols-2 xl:grid-cols-3">
          {running.map((card) => (
            <AgentTerminalTile key={card.paneKey} card={card} />
          ))}
        </div>
      )}
    </div>
  )
}
