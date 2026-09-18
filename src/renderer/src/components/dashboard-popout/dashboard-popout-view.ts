/** Layouts the pop-out dashboard can render. */
export type DashboardPopoutView = 'kanban' | 'split'

/** `kanban` is the historical default, so unknown/absent values fall back to it. */
export function resolveDashboardPopoutView(view: string | null | undefined): DashboardPopoutView {
  return view === 'split' ? 'split' : 'kanban'
}
