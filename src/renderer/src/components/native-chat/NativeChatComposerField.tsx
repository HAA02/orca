import type {
  ClipboardEventHandler,
  CompositionEventHandler,
  KeyboardEventHandler,
  RefObject
} from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NATIVE_FILE_DROP_TARGET } from '../../../../shared/native-file-drop'
import { NativeChatImagePreview } from './NativeChatImagePreview'
import type { ComposerAutocomplete, NativeChatPickerItem } from './native-chat-composer-state'
import type { TeammateMentionOption } from '../../../../shared/native-chat-teammate-mention'
import { NativeChatMentionHint, NativeChatPickerMenu } from './NativeChatAutocompleteMenus'
import { NativeChatTeammateMentionMenu } from './NativeChatTeammateMentionMenu'
import { NativeChatComposerActions } from './NativeChatComposerActions'
import { nativeChatComposerPlaceholder } from './native-chat-composer-target'
import type {
  SessionOptionDescriptor,
  SessionOptionsSurface
} from '../../../../shared/native-chat-session-options'

export type NativeChatComposerFieldProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  terminalTabId: string
  draft: string
  disabled: boolean
  hasPty: boolean
  canSend: boolean
  autocomplete: ComposerAutocomplete
  activeSuggestion: number
  notice: string | null
  imageAttachments: readonly NativeChatComposerImageAttachment[]
  sendButtonDisabled: boolean
  isWorking: boolean
  attachDisabled: boolean
  dictationDisabled: boolean
  isDictating: boolean
  isDictationHoldMode: boolean
  onDraftChange: (value: string, element: HTMLTextAreaElement) => void
  onTextareaSelect: (element: HTMLTextAreaElement) => void
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>
  onCompositionStart: CompositionEventHandler<HTMLTextAreaElement>
  onCompositionEnd: CompositionEventHandler<HTMLTextAreaElement>
  onPaste: ClipboardEventHandler<HTMLTextAreaElement>
  pickerListboxId: string
  onChoosePickerItem: (item: NativeChatPickerItem) => void
  onRetrySkills: () => void
  onAcceptMention: () => void
  onChooseTeammate: (option: TeammateMentionOption) => void
  onRemoveImageAttachment: (id: string) => void
  onAttach: () => void
  onDictationToggle: () => void
  onDictationHoldStart: () => void
  onDictationHoldEnd: () => void
  onSend: () => void
  onStop?: () => void
  sessionOptionsSurface: SessionOptionsSurface | null
  sessionOptionsSnapshot: SessionOptionDescriptor[]
}

export type NativeChatComposerImageAttachment = {
  id: string
  path: string
}

export function NativeChatComposerField({
  textareaRef,
  terminalTabId,
  draft,
  disabled,
  hasPty,
  canSend,
  autocomplete,
  activeSuggestion,
  notice,
  imageAttachments,
  sendButtonDisabled,
  isWorking,
  attachDisabled,
  dictationDisabled,
  isDictating,
  isDictationHoldMode,
  onDraftChange,
  onTextareaSelect,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onPaste,
  pickerListboxId,
  onChoosePickerItem,
  onRetrySkills,
  onAcceptMention,
  onChooseTeammate,
  onRemoveImageAttachment,
  onAttach,
  onDictationToggle,
  onDictationHoldStart,
  onDictationHoldEnd,
  onSend,
  onStop,
  sessionOptionsSurface,
  sessionOptionsSnapshot
}: NativeChatComposerFieldProps): React.JSX.Element {
  return (
    <div className="shrink-0 bg-background">
      {/* Extra bottom padding keeps the input box off the window rim. */}
      <div className="px-3 pt-2 pb-4 sm:px-4">
        <div className="relative mx-auto w-full max-w-4xl">
          {autocomplete.mode === 'slash' || autocomplete.mode === 'skill' ? (
            <NativeChatPickerMenu
              autocomplete={autocomplete}
              activeIndex={activeSuggestion}
              listboxId={pickerListboxId}
              onChoose={onChoosePickerItem}
              onRetry={onRetrySkills}
            />
          ) : null}
          {autocomplete.mode === 'mention' && autocomplete.teammates.length > 0 ? (
            <NativeChatTeammateMentionMenu
              teammates={autocomplete.teammates}
              query={autocomplete.query}
              activeIndex={activeSuggestion}
              listboxId={pickerListboxId}
              onChoose={onChooseTeammate}
            />
          ) : null}
          {autocomplete.mode === 'mention' && autocomplete.teammates.length === 0 ? (
            <NativeChatMentionHint query={autocomplete.query} onAccept={onAcceptMention} />
          ) : null}
          {notice ? (
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ImageOff className="size-3.5 shrink-0" />
              <span>{notice}</span>
            </div>
          ) : null}
          <div
            data-native-file-drop-target={NATIVE_FILE_DROP_TARGET.composer}
            className={cn(
              // Why: always-on hairline (token-level border, not focus ring) —
              // no focus/click border flash. The box is a container, not a
              // focus target.
              'rounded-lg border border-border p-1.5 shadow-xs',
              'bg-muted/50 dark:bg-input/40'
            )}
          >
            {imageAttachments.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1.5 px-1">
                {imageAttachments.map((attachment) => (
                  <NativeChatImagePreview
                    key={attachment.id}
                    terminalTabId={terminalTabId}
                    path={attachment.path}
                    size="composer"
                    onRemove={() => onRemoveImageAttachment(attachment.id)}
                  />
                ))}
              </div>
            ) : null}
            <textarea
              ref={textareaRef}
              value={draft}
              disabled={disabled}
              rows={2}
              onChange={(e) => onDraftChange(e.target.value, e.currentTarget)}
              onKeyDown={onKeyDown}
              onCompositionStart={onCompositionStart}
              onCompositionEnd={onCompositionEnd}
              onPaste={onPaste}
              onSelect={(e) => onTextareaSelect(e.currentTarget)}
              aria-expanded={autocomplete.mode === 'slash' || autocomplete.mode === 'skill'}
              aria-controls={
                autocomplete.mode === 'slash' || autocomplete.mode === 'skill'
                  ? pickerListboxId
                  : undefined
              }
              aria-activedescendant={
                (autocomplete.mode === 'slash' || autocomplete.mode === 'skill') &&
                autocomplete.items.length > 0
                  ? `${pickerListboxId}-option-${Math.min(activeSuggestion, autocomplete.items.length - 1)}`
                  : undefined
              }
              placeholder={nativeChatComposerPlaceholder(hasPty, canSend)}
              // Why: coarse-pointer min-height follows the app's touch target convention.
              // scrollbar-sleek keeps the overflow gutter from showing the heavy
              // native scrollbar once the draft exceeds max-height.
              className={cn(
                'scrollbar-sleek min-h-12 max-h-28 w-full resize-none bg-transparent px-2 py-1 text-sm outline-none pointer-coarse:min-h-14',
                'placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <NativeChatComposerActions
                attachDisabled={attachDisabled}
                dictationDisabled={dictationDisabled}
                sendDisabled={sendButtonDisabled}
                isWorking={isWorking}
                isDictating={isDictating}
                isDictationHoldMode={isDictationHoldMode}
                onAttach={onAttach}
                onDictationToggle={onDictationToggle}
                onDictationHoldStart={onDictationHoldStart}
                onDictationHoldEnd={onDictationHoldEnd}
                onSend={onSend}
                onStop={onStop}
                sessionOptionsSurface={sessionOptionsSurface}
                sessionOptionsSnapshot={sessionOptionsSnapshot}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
