import { openHttpLink, type HttpLinkSourceOwner } from '@/lib/http-link-routing'
import { getConnectionId } from '@/lib/connection-context'
import { openDetectedFilePath } from '@/components/terminal-pane/terminal-file-open-routing'
import {
  resolveNativeChatFileLink,
  type NativeChatFileLinkContext
} from './native-chat-file-link'

const HTTP_HREF = /^https?:\/\//i

export type NativeChatMarkdownLinkClick = {
  preventDefault: () => void
  stopPropagation: () => void
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
}

export function nativeChatHttpSourceOwner(
  context: NativeChatFileLinkContext | null
): HttpLinkSourceOwner | undefined {
  if (!context) {
    return undefined
  }
  const runtimeEnvironmentId = context.runtimeEnvironmentId?.trim()
  if (runtimeEnvironmentId) {
    return { kind: 'runtime', runtimeEnvironmentId }
  }
  const connectionId = getConnectionId(context.worktreeId)
  if (connectionId) {
    return { kind: 'ssh', connectionId }
  }
  if (connectionId === null) {
    return { kind: 'local' }
  }
  return undefined
}

function isMacPlatform(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
}

/**
 * Open a native-chat markdown link. Returns true when this click was claimed
 * so the shared markdown fallback does not open it again.
 */
export function activateNativeChatMarkdownLink(
  event: NativeChatMarkdownLinkClick,
  href: string | undefined,
  context: NativeChatFileLinkContext | null,
  sourceOwner?: HttpLinkSourceOwner
): boolean {
  const target = resolveNativeChatFileLink(href, context)
  if (target && context) {
    event.preventDefault()
    event.stopPropagation()
    openDetectedFilePath(target.absolutePath, target.line, target.column, {
      worktreeId: context.worktreeId,
      worktreePath: context.worktreePath,
      runtimeEnvironmentId: context.runtimeEnvironmentId,
      openWithSystemDefault: event.shiftKey
    })
    return true
  }

  const url = href?.trim()
  if (!url || !HTTP_HREF.test(url)) {
    return false
  }
  // Why: <a target="_blank"> relies on Electron window-open, which Linux drops
  // when the session denies the openExternal permission. Open from the click.
  event.preventDefault()
  event.stopPropagation()
  const primaryModifier = isMacPlatform() ? event.metaKey : event.ctrlKey
  openHttpLink(url, {
    worktreeId: context?.worktreeId,
    forceSystemBrowser: event.shiftKey && primaryModifier,
    sourceOwner
  })
  return true
}
