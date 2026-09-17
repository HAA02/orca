const DEFAULT_MAX = 5

let inflight = 0
const tabs = new Set<string>()

export function countInflightTeammates(): number {
  return inflight
}

export function tryAcquireTeammateSlots(count: number, maxConcurrent = DEFAULT_MAX): boolean {
  if (count < 1 || inflight + count > maxConcurrent) {
    return false
  }
  inflight += count
  return true
}

export function registerTeammateTab(tabId: string): void {
  tabs.add(tabId)
}

export function releaseTeammateSlot(tabId?: string): void {
  if (tabId) {
    tabs.delete(tabId)
  }
  if (inflight > 0) {
    inflight -= 1
  }
}

export function resetTeammateSlots(): void {
  inflight = 0
  tabs.clear()
}
