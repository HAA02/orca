import { useCallback, useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { useAppStore } from '../../store'
import { applyMentionSuggestion } from './native-chat-composer-state'
import { selectTeammateDetectedAgents } from '@/lib/native-chat-teammate-catalog'
import { dispatchNativeChatTeammate } from '@/lib/native-chat-teammate-dispatch'
import {
  buildTeammateMentionCatalog,
  teammateMentionInsertToken
} from '../../../../shared/native-chat-teammate-mention'
import type { TeammateMentionOption } from '../../../../shared/native-chat-teammate-mention'
import {
  extractResolvedTeammateMention,
  mergeTeammateMentionCatalog,
  resolveNativeChatTeammateSettings
} from '../../../../shared/native-chat-teammate-presets'

export function useNativeChatTeammateMention(args: {
  terminalTabId: string
  paneKey?: string
  draft: string
  caret: number
  textareaRef: RefObject<HTMLTextAreaElement | null>
  setDraft: (value: string) => void
  setCaret: Dispatch<SetStateAction<number>>
  setActiveSuggestion: Dispatch<SetStateAction<number>>
  onOptimisticSend?: (text: string, imagePaths?: string[]) => string | undefined
  readLeadContext?: () => string
}): {
  teammateOptions: TeammateMentionOption[]
  completeTeammate: (option: TeammateMentionOption) => void
  tryDispatchTeammate: (text: string, imagePaths: readonly string[]) => boolean
} {
  const {
    terminalTabId,
    paneKey,
    draft,
    caret,
    textareaRef,
    setDraft,
    setCaret,
    setActiveSuggestion,
    onOptimisticSend,
    readLeadContext
  } = args
  const detectedKey = useAppStore((state) =>
    selectTeammateDetectedAgents(state, terminalTabId).join('\0')
  )
  const discovered = useAppStore(
    (state) => state.settings?.sourceControlAi?.discoveredModelsByAgent
  )
  const rawTeammate = useAppStore((state) => state.settings?.nativeChatTeammate)
  const teammateSettings = useMemo(
    () => resolveNativeChatTeammateSettings({ nativeChatTeammate: rawTeammate }),
    [rawTeammate]
  )
  const teammateOptions = useMemo(() => {
    const detected = detectedKey ? detectedKey.split('\0') : []
    return mergeTeammateMentionCatalog(
      buildTeammateMentionCatalog({
        detectedAgents: detected,
        discoveredModelsByAgent: discovered
      }),
      teammateSettings,
      detected
    )
  }, [detectedKey, discovered, teammateSettings])

  const completeTeammate = useCallback(
    (option: TeammateMentionOption) => {
      const inserted = applyMentionSuggestion(draft, caret, teammateMentionInsertToken(option))
      let next = inserted
      if (!option.model && inserted.draft.slice(0, inserted.caret).endsWith(' ')) {
        const before = inserted.draft.slice(0, inserted.caret).slice(0, -1)
        next = {
          draft: before + inserted.draft.slice(inserted.caret),
          caret: before.length
        }
      }
      setDraft(next.draft)
      setCaret(next.caret)
      setActiveSuggestion(0)
      const textarea = textareaRef.current
      textarea?.focus()
      requestAnimationFrame(() => textarea?.setSelectionRange(next.caret, next.caret))
    },
    [caret, draft, setActiveSuggestion, setCaret, setDraft, textareaRef]
  )

  const tryDispatchTeammate = useCallback(
    (text: string, imagePaths: readonly string[]) => {
      if (imagePaths.length > 0) {
        return false
      }
      const mention = extractResolvedTeammateMention(text, teammateSettings)
      if (!mention) {
        return false
      }
      onOptimisticSend?.(text)
      void dispatchNativeChatTeammate({
        leadTabId: terminalTabId,
        mention,
        leadContext: readLeadContext?.() ?? '',
        paneKey
      })
      return true
    },
    [onOptimisticSend, paneKey, readLeadContext, teammateSettings, terminalTabId]
  )

  return { teammateOptions, completeTeammate, tryDispatchTeammate }
}
