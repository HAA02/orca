import { Kanban, LayoutGrid } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { translate } from '@/i18n/i18n'
import type { DashboardPopoutView } from './dashboard-popout-view'

type DashboardViewToggleProps = {
  value: DashboardPopoutView
  onChange: (view: DashboardPopoutView) => void
  className?: string
}

/** Segmented control switching the pop-out between the kanban board and the
 *  split terminal grid. Both views render their own copy so the toggle lives
 *  next to each view's title. */
export function DashboardViewToggle({
  value,
  onChange,
  className
}: DashboardViewToggleProps): React.JSX.Element {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next === 'kanban' || next === 'split') {
          onChange(next)
        }
      }}
      variant="outline"
      size="sm"
      className={className}
      aria-label={translate('dashboardPopout.view.switch', 'Dashboard view')}
    >
      <ToggleGroupItem
        value="kanban"
        aria-label={translate('dashboardPopout.view.kanban', 'Board')}
        title={translate('dashboardPopout.view.kanban', 'Board')}
      >
        <Kanban className="size-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="split"
        aria-label={translate('dashboardPopout.view.split', 'Split terminals')}
        title={translate('dashboardPopout.view.split', 'Split terminals')}
      >
        <LayoutGrid className="size-3.5" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
