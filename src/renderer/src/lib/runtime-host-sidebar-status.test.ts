import { describe, expect, it } from 'vitest'
import { isRuntimeHostChipDisconnected } from './runtime-host-sidebar-status'
import type { RuntimeStatus } from '../../../shared/runtime-types'

function status(runtimeId = 'rt'): RuntimeStatus {
  return {
    runtimeId,
    rendererGraphEpoch: 0,
    graphStatus: 'ready',
    authoritativeWindowId: null,
    liveTabCount: 0,
    liveLeafCount: 0
  } as RuntimeStatus
}

describe('isRuntimeHostChipDisconnected', () => {
  it('does not treat a never-probed host as disconnected', () => {
    expect(isRuntimeHostChipDisconnected(undefined)).toBe(false)
  })

  it('treats a failed probe as disconnected', () => {
    expect(isRuntimeHostChipDisconnected({ status: null, checkedAt: 1 })).toBe(true)
  })

  it('treats a reachable probe as connected', () => {
    expect(isRuntimeHostChipDisconnected({ status: status(), checkedAt: 1 })).toBe(false)
  })
})
