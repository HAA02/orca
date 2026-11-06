import { useEffect, type RefObject } from 'react'

/** Keep xterm's WebGL canvas from stealing clicks meant for the chat overlay. */
export function useNativeChatPaneHitTarget(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const pane = rootRef.current?.closest('.pane')
    if (!(pane instanceof HTMLElement)) {
      return
    }
    // Why: chat is portaled over the xterm pane. On Linux the WebGL canvas can
    // win hit-testing, so clicks on markdown links never reach the anchors.
    pane.setAttribute('data-native-chat-open', '')
    return () => pane.removeAttribute('data-native-chat-open')
  }, [rootRef])
}
