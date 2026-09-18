import { describe, expect, it } from 'vitest'
import { resolveDashboardPopoutView } from './dashboard-popout-view'

describe('resolveDashboardPopoutView', () => {
  it('defaults to the kanban board for absent or unknown views', () => {
    expect(resolveDashboardPopoutView(null)).toBe('kanban')
    expect(resolveDashboardPopoutView(undefined)).toBe('kanban')
    expect(resolveDashboardPopoutView('')).toBe('kanban')
    expect(resolveDashboardPopoutView('nope')).toBe('kanban')
  })

  it('resolves the split grid when requested', () => {
    expect(resolveDashboardPopoutView('split')).toBe('split')
    expect(resolveDashboardPopoutView('kanban')).toBe('kanban')
  })
})
