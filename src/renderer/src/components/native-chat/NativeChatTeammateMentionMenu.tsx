import { memo, useEffect, useRef } from 'react'
import { Bot } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { TeammateMentionOption } from '../../../../shared/native-chat-teammate-mention'

const VISIBLE_LIMIT = 24

export const NativeChatTeammateMentionMenu = memo(function NativeChatTeammateMentionMenu({
  teammates,
  query,
  activeIndex,
  listboxId,
  onChoose
}: {
  teammates: readonly TeammateMentionOption[]
  query: string
  activeIndex: number
  listboxId: string
  onChoose: (option: TeammateMentionOption) => void
}): React.JSX.Element {
  const activeItemRef = useRef<HTMLButtonElement | null>(null)
  const items = teammates.slice(0, VISIBLE_LIMIT)

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, items])

  return (
    <div
      id={listboxId}
      role="listbox"
      className="scrollbar-sleek absolute bottom-full left-0 right-0 z-20 mb-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
    >
      <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        {translate('components.native-chat.composer.teammates', 'Teammates')}
      </div>
      {items.length === 0 ? (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {translate('components.native-chat.composer.noTeammates', 'No matching teammates')}
          {query ? (
            <>
              {' '}
              <span className="font-medium text-foreground">@{query}</span>
            </>
          ) : null}
        </div>
      ) : (
        items.map((item, index) => {
          const selected = index === activeIndex
          return (
            <button
              id={`${listboxId}-option-${index}`}
              key={item.token}
              ref={selected ? activeItemRef : null}
              role="option"
              aria-selected={selected}
              type="button"
              onPointerDown={(event) => {
                event.preventDefault()
                onChoose(item)
              }}
              className={cn(
                'flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-[13px] hover:bg-accent hover:text-accent-foreground',
                selected && 'border-border bg-accent text-accent-foreground'
              )}
            >
              <Bot className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono font-medium">{item.token}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.kind === 'roster'
                    ? item.label
                    : item.kind === 'preset'
                      ? item.label
                      : item.model
                        ? item.label
                        : translate('components.native-chat.composer.teammateAgent', 'Agent')}
                </span>
              </span>
            </button>
          )
        })
      )}
    </div>
  )
})
