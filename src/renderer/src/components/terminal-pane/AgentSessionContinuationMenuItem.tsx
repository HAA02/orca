import { MessageSquarePlus } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'

type AgentSessionContinuationMenuItemProps = {
  onSelect: () => void
  /** Lets dense menus (tab strip "+") match their own row metrics. */
  className?: string
}

export function AgentSessionContinuationMenuItem({
  onSelect,
  className
}: AgentSessionContinuationMenuItemProps): React.JSX.Element {
  return (
    <DropdownMenuItem onSelect={onSelect} className={className}>
      <MessageSquarePlus />
      {translate(
        'components.agentSessionContinuation.continueInNewSession',
        'Continue in New Session…'
      )}
    </DropdownMenuItem>
  )
}
