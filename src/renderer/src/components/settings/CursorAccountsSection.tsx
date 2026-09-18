import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { AgentIcon } from '@/lib/agent-catalog'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { SearchableSetting } from './SearchableSetting'
import type { CursorAccountStatus } from '../../../../shared/rate-limit-types'

const CURSOR_CLI_DOCS_URL = 'https://cursor.com/docs/cli/using'

export function CursorAccountsSection({
  sessionCookie,
  updateSettings
}: {
  sessionCookie: string
  updateSettings: (updates: { cursorSessionCookie?: string }) => Promise<void> | void
}): React.JSX.Element {
  const [status, setStatus] = useState<CursorAccountStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadStatus = useCallback(async (): Promise<void> => {
    try {
      const next = await window.api.cursorAccounts.getStatus()
      setStatus(next)
    } catch (error) {
      console.error('Failed to load Cursor account status:', error)
      setStatus({
        signedIn: false,
        email: null,
        displayName: null,
        authSource: null,
        cursorOnPath: false,
        cursorAgentOnPath: false,
        error: error instanceof Error ? error.message : 'Unable to read Cursor sign-in'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true)
    try {
      await loadStatus()
    } finally {
      setRefreshing(false)
    }
  }

  const signedIn = status?.signedIn === true
  const accountLabel =
    status?.email ??
    status?.displayName ??
    translate('auto.components.settings.CursorAccountsSection.b2c3d4e5f6', 'Signed in')

  return (
    <section id="accounts-cursor" className="space-y-4 scroll-mt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AgentIcon agent="cursor" size={16} />
            {translate('auto.components.settings.CursorAccountsSection.a1b2c3d4e5', 'Cursor')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.settings.CursorAccountsSection.f6e5d4c3b2',
              'Uses your Cursor IDE / cursor agent login (~/.cursor/cli-config.json). Orca does not store a separate Cursor password.'
            )}
          </p>
        </div>
        <a
          href={CURSOR_CLI_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {translate(
            'auto.components.settings.CursorAccountsSection.0d8e77bc40',
            'Cursor CLI docs'
          )}
          <ExternalLink className="size-3" />
        </a>
      </div>

      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border bg-muted/20 p-3',
          signedIn ? 'border-border/60' : 'border-border/40'
        )}
      >
        <ShieldCheck
          className={cn(
            'mt-0.5 size-4 shrink-0',
            signedIn ? 'text-foreground' : 'text-muted-foreground'
          )}
        />
        <div className="min-w-0 flex-1 space-y-1">
          {loading ? (
            <p className="text-xs text-muted-foreground">
              {translate('auto.components.settings.CursorAccountsSection.ad47a33f72', 'Loading…')}
            </p>
          ) : signedIn ? (
            <>
              <p className="truncate text-xs font-medium">{accountLabel}</p>
              <p className="text-xs text-muted-foreground">
                {status?.authSource === 'api-key'
                  ? translate(
                      'auto.components.settings.CursorAccountsSection.c3d4e5f6a7',
                      'Signed in with CURSOR_API_KEY / CURSOR_AUTH_TOKEN in the environment.'
                    )
                  : translate(
                      'auto.components.settings.CursorAccountsSection.b36fa2c908',
                      'Signed in. Orca reads Cursor CLI auth stored on disk.'
                    )}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-medium">
                {translate(
                  'auto.components.settings.CursorAccountsSection.e5f6a7b8c9',
                  'Not signed in to Cursor CLI'
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {status?.cursorOnPath || status?.cursorAgentOnPath
                  ? translate(
                      'auto.components.settings.CursorAccountsSection.f6a7b8c9d0',
                      'In a terminal, run cursor-agent login, then click Refresh status here.'
                    )
                  : translate(
                      'auto.components.settings.CursorAccountsSection.a9b0c1d2e3',
                      'Install cursor-agent (or Cursor IDE), then run cursor-agent login in a terminal.'
                    )}
              </p>
            </>
          )}
          {status?.error ? <p className="text-xs text-destructive">{status.error}</p> : null}
        </div>
        <Button
          variant="outline"
          size="xs"
          disabled={refreshing}
          onClick={() => void handleRefresh()}
          className="shrink-0 gap-1"
        >
          {refreshing ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCw className="size-3" />
          )}
          {translate('auto.components.settings.CursorAccountsSection.3325d996cb', 'Refresh status')}
        </Button>
      </div>

      {signedIn ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {status?.authSource === 'api-key'
              ? translate('auto.components.settings.CursorAccountsSection.a8f3e2c1b4', 'API key')
              : translate(
                  'auto.components.settings.CursorAccountsSection.b7e2d9f0a3',
                  'Cursor IDE login'
                )}
          </Badge>
        </div>
      ) : null}

      <SearchableSetting
        title={translate(
          'auto.components.settings.CursorAccountsSection.usageCookieTitle',
          'Cursor Usage Cookie'
        )}
        description={translate(
          'auto.components.settings.CursorAccountsSection.usageCookieDescription',
          'Paste your cursor.com session cookie to track plan usage and limits in the status bar.'
        )}
        keywords={['cursor', 'cookie', 'session', 'usage', 'rate limit', 'status bar']}
        className="space-y-2"
      >
        <Label>
          {translate(
            'auto.components.settings.CursorAccountsSection.usageCookieLabel',
            'Cursor session cookie'
          )}
        </Label>
        <div className="flex gap-2">
          <Input
            type="password"
            value={sessionCookie}
            onChange={(e) => {
              void updateSettings({ cursorSessionCookie: e.target.value })
            }}
            placeholder={translate(
              'auto.components.settings.CursorAccountsSection.usageCookiePlaceholder',
              'WorkosCursorSessionToken=…'
            )}
            spellCheck={false}
            className="flex-1 text-xs"
          />
          {sessionCookie ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                void updateSettings({ cursorSessionCookie: '' })
              }}
              className="h-7 shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              {translate('auto.components.settings.AccountsPane.b398b834c9', 'Clear')}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {translate(
            'auto.components.settings.CursorAccountsSection.usageCookieHint',
            'Find it in your browser DevTools → Application → Cookies → cursor.com → WorkosCursorSessionToken. Orca sends only this cookie when fetching usage.'
          )}
        </p>
      </SearchableSetting>
    </section>
  )
}
