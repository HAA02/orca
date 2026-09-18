import { useState } from 'react'
import { AgentKanbanBoard } from './AgentKanbanBoard'
import { AgentTerminalGrid } from './AgentTerminalGrid'
import { useDashboardSnapshot } from './useDashboardSnapshot'
import { resolveDashboardPopoutView } from './dashboard-popout-view'

type DashboardPopoutRootProps = {
  /** The layout requested via popout.html?view=<name>. Only "kanban" and
   *  "split" exist today; unknown views fall back to the board. */
  view: string | null
}

/**
 * Root of the pop-out dashboard window. Subscribes to the live snapshot relayed
 * from the main window and renders the requested layout, letting the user
 * switch between the board and the split terminal grid in place.
 */
export function DashboardPopoutRoot({ view }: DashboardPopoutRootProps): React.JSX.Element {
  const snapshot = useDashboardSnapshot()
  const [activeView, setActiveView] = useState(() => resolveDashboardPopoutView(view))

  if (activeView === 'split') {
    return <AgentTerminalGrid snapshot={snapshot} onShowKanban={() => setActiveView('kanban')} />
  }
  return <AgentKanbanBoard snapshot={snapshot} onShowSplit={() => setActiveView('split')} />
}
