import { describe, expect, it } from 'vitest'
import {
  countInflightTeammates,
  releaseTeammateSlot,
  resetTeammateSlots,
  tryAcquireTeammateSlots
} from './native-chat-teammate-concurrency'

describe('teammate concurrency slots', () => {
  it('caps concurrent workers at the configured maximum', () => {
    resetTeammateSlots()
    expect(tryAcquireTeammateSlots(5, 5)).toBe(true)
    expect(tryAcquireTeammateSlots(1, 5)).toBe(false)
    releaseTeammateSlot()
    expect(countInflightTeammates()).toBe(4)
    expect(tryAcquireTeammateSlots(1, 5)).toBe(true)
    resetTeammateSlots()
    expect(countInflightTeammates()).toBe(0)
  })
})
