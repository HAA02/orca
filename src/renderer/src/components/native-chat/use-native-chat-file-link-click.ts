import { useCallback } from 'react'
import type { CommentMarkdownLinkClickHandler } from '@/components/sidebar/CommentMarkdown'
import {
  activateNativeChatMarkdownLink,
  nativeChatHttpSourceOwner
} from './native-chat-markdown-link-activation'
import type { NativeChatFileLinkContext } from './native-chat-file-link'

export function useNativeChatFileLinkClick(
  context: NativeChatFileLinkContext | null
): CommentMarkdownLinkClickHandler {
  return useCallback<CommentMarkdownLinkClickHandler>(
    (event, href) => {
      activateNativeChatMarkdownLink(event, href, context, nativeChatHttpSourceOwner(context))
    },
    [context]
  )
}
