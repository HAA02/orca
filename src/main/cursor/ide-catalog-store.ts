import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  mergeCursorIdeCatalogEntries,
  parseCursorAppliedModelConfig,
  parseCursorCliConfigCatalog,
  parseCursorReactiveStorageCatalog,
  resolveEnabledCursorCliModels,
  type CursorIdeCatalogEntry
} from '../../shared/cursor-ide-catalog'

const REACTIVE_STORAGE_KEY =
  'src.vs.platform.reactivestorage.browser.reactiveStorageServiceImpl.persistentStorage.applicationUser'
const APPLIED_MODEL_CONFIG_KEY = 'cursor/applicationOpenModelAppliedConfig'

function cursorStateDbPath(): string {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA ?? '', 'Cursor', 'User', 'globalStorage', 'state.vscdb')
  }
  if (process.platform === 'darwin') {
    return join(
      homedir(),
      'Library',
      'Application Support',
      'Cursor',
      'User',
      'globalStorage',
      'state.vscdb'
    )
  }
  const configHome = process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), '.config')
  return join(configHome, 'Cursor', 'User', 'globalStorage', 'state.vscdb')
}

function readJsonFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function readCursorStateJson(key: string): unknown {
  const dbPath = cursorStateDbPath()
  if (!dbPath || !existsSync(dbPath)) {
    return null
  }
  try {
    const db = new DatabaseSync(dbPath, { readOnly: true })
    try {
      const row = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(key) as
        | { value?: string }
        | undefined
      return row?.value ? JSON.parse(row.value) : null
    } finally {
      db.close()
    }
  } catch {
    return null
  }
}

export function readCursorIdeCatalogModels(): CursorIdeCatalogEntry[] {
  const cliConfig = readJsonFile(join(homedir(), '.cursor', 'cli-config.json'))
  return mergeCursorIdeCatalogEntries(
    parseCursorReactiveStorageCatalog(readCursorStateJson(REACTIVE_STORAGE_KEY)),
    parseCursorAppliedModelConfig(readCursorStateJson(APPLIED_MODEL_CONFIG_KEY)),
    parseCursorCliConfigCatalog(cliConfig)
  )
}

export function readHermesCachedCursorCliModels(): string[] {
  const cache = readJsonFile(join(homedir(), '.hermes', 'integrations', 'cursor-models.json'))
  if (!cache || typeof cache !== 'object') {
    return []
  }
  const account = (cache as { account_cli_models?: unknown }).account_cli_models
  const enabled = (cache as { enabled_cli_models?: unknown }).enabled_cli_models
  const source = Array.isArray(account) && account.length > 0 ? account : enabled
  return Array.isArray(source) ? source.map((id) => String(id)).filter(Boolean) : []
}

export function enabledCursorCliModelsFromLocalIde(accountCliModels: readonly string[]): string[] {
  const account = accountCliModels.length > 0 ? accountCliModels : readHermesCachedCursorCliModels()
  return resolveEnabledCursorCliModels(readCursorIdeCatalogModels(), account)
}
