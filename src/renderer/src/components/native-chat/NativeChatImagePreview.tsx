import { useEffect, useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { basename } from '@/lib/path'
import { cn } from '@/lib/utils'
import { loadLocalImageAbsolutePath } from '../editor/useLocalImageSrc'
import { resolveNativeChatAttachmentOwner } from './native-chat-attachment-upload'
import { isNativeChatPastedImagePath } from './native-chat-image-paste'

export type NativeChatImagePreviewProps = {
  terminalTabId: string
  path?: string
  url?: string
  alt?: string
  size: 'composer' | 'message'
  onRemove?: () => void
}

function previewLabel(path: string | undefined, url: string | undefined, alt: string | undefined) {
  if (path && isNativeChatPastedImagePath(path)) {
    return translate('components.native-chat.composer.pastedImageLabel', 'Pasted image')
  }
  if (path) {
    return basename(path)
  }
  return alt ?? url ?? 'Image'
}

function isRemotePreviewSrc(src: string): boolean {
  return (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:') ||
    src.startsWith('blob:')
  )
}

export function NativeChatImagePreview({
  terminalTabId,
  path,
  url,
  alt,
  size,
  onRemove
}: NativeChatImagePreviewProps): React.JSX.Element {
  const connectionId = useAppStore((state) => {
    const owner = resolveNativeChatAttachmentOwner(state, terminalTabId)
    return owner.kind === 'ssh' ? owner.connectionId : null
  })
  const [src, setSrc] = useState<string | null>(url && isRemotePreviewSrc(url) ? url : null)
  const label = previewLabel(path, url, alt)
  const isComposer = size === 'composer'

  useEffect(() => {
    if (url && isRemotePreviewSrc(url)) {
      setSrc(url)
      return
    }
    if (!path) {
      setSrc(null)
      return
    }
    let cancelled = false
    void loadLocalImageAbsolutePath(path, connectionId).then((loaded) => {
      if (!cancelled) {
        setSrc(loaded)
      }
    })
    return () => {
      cancelled = true
    }
  }, [connectionId, path, url])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border border-border bg-background',
        isComposer ? 'h-16 w-20 shrink-0' : 'max-w-full'
      )}
      title={path ?? url ?? label}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? label}
          className={cn(
            'block bg-muted object-cover',
            isComposer ? 'h-full w-full' : 'max-h-64 max-w-full object-contain'
          )}
        />
      ) : (
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground',
            isComposer ? 'h-full w-full' : 'min-h-16'
          )}
        >
          <ImageIcon className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
      )}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={translate(
            'components.native-chat.composer.removeAttachment',
            'Remove attachment'
          )}
          className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-sm bg-background/90 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  )
}
