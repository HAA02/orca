import { describe, expect, it } from 'vitest'
import {
  applyWorkerDoneMessages,
  formatTeammateInboxText,
  readTeammateInbox,
  resetTeammateInbox,
  teammateInboxAsMessages
} from './native-chat-teammate-inbox'
import { resetTeammateSlots, tryAcquireTeammateSlots } from './native-chat-teammate-concurrency'

describe('teammate inbox', () => {
  it('turns worker_done mail into a lead-chat assistant bubble', () => {
    resetTeammateInbox()
    resetTeammateSlots()
    tryAcquireTeammateSlots(1, 5)
    const tasks = new Map([['task-1', { tabId: 'worker-tab', token: '@grok-high' }]])
    applyWorkerDoneMessages(
      'pane-1',
      [
        {
          id: 'msg-1',
          subject: 'review complete',
          body: 'No blocking issues.',
          payload: JSON.stringify({ taskId: 'task-1' }),
          type: 'worker_done'
        }
      ],
      tasks
    )
    const entries = readTeammateInbox('pane-1')
    expect(entries).toHaveLength(1)
    expect(formatTeammateInboxText(entries[0])).toContain('@grok-high')
    expect(teammateInboxAsMessages(entries)[0]?.role).toBe('assistant')
    expect(tasks.size).toBe(0)
  })
})
