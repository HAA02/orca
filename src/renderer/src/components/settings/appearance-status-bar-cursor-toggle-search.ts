import type { StatusBarItem } from '../../../../shared/types'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'

export function getCursorStatusBarToggleSearchEntry(): {
  id: StatusBarItem
  title: string
  description: string
  keywords: string[]
  toggleDescription: string
} {
  return {
    id: 'cursor',
    title: translate('auto.components.settings.appearance.search.a1f4c7e2b9', 'Cursor Usage'),
    description: translate(
      'auto.components.settings.appearance.search.b2e5d8f3c1',
      'Show Cursor plan usage from your cursor.com session cookie.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.896eb53fd4',
        'status bar'
      ),
      ...translateSearchKeyword('auto.components.settings.appearance.search.c3f6e9a4d2', 'cursor'),
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.d4a7f0b5e3',
        'composer'
      ),
      ...translateSearchKeyword('auto.components.settings.appearance.search.00a028f25f', 'usage'),
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.e5b8a1c6f4',
        'plan limits'
      )
    ],
    toggleDescription: translate(
      'settings.appearance.statusBar.cursorToggleDescription',
      'Show Cursor plan usage for the billing cycle.'
    )
  }
}
