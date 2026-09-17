import { useEffect, useState } from 'react'
import {
  readTeammateInbox,
  subscribeTeammateInbox,
  teammateInboxAsMessages
} from '@/lib/native-chat-teammate-inbox'
import type { NativeChatMessage } from '../../../../shared/native-chat-types'

export function useNativeChatTeammateInbox(paneKey: string): NativeChatMessage[] {
  const [entries, setEntries] = useState(() => readTeammateInbox(paneKey))
  useEffect(() => {
    setEntries(readTeammateInbox(paneKey))
    return subscribeTeammateInbox(paneKey, () => {
      setEntries(readTeammateInbox(paneKey))
    })
  }, [paneKey])
  return teammateInboxAsMessages(entries)
}
