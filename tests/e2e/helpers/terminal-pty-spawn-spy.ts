import type { ElectronApplication } from '@stablyai/playwright-test'

export type PtySpawnLogEntry = {
  command: string
  launchAgent?: string
  tabId?: string
  startupCommandDelivery?: string
  hasLaunchConfig?: boolean
  argKeys?: string[]
}

const SPY_INSTALL_ATTEMPTS = 3
const SPY_INSTALL_RETRY_MS = 150

/**
 * Records the command strings the renderer hands to `pty:spawn`.
 *
 * Why: the launch command (including session-option flags such as `--model`) is
 * composed in the renderer and only observable at this IPC boundary; main's
 * args are the only place the final string exists before the shell sees it.
 */
export async function installTerminalPtySpawnSpy(app: ElectronApplication): Promise<void> {
  for (let attempt = 1; attempt <= SPY_INSTALL_ATTEMPTS; attempt += 1) {
    try {
      await app.evaluate(({ ipcMain }) => {
        const global = globalThis as unknown as {
          __ptySpawnLog?: PtySpawnLogEntry[]
          __ptySpawnSpyInstalled?: boolean
        }
        if (global.__ptySpawnSpyInstalled) {
          return
        }
        const invokeHandlers = (
          ipcMain as unknown as {
            _invokeHandlers?: Map<string, (event: unknown, args: unknown) => unknown>
          }
        )._invokeHandlers
        const spawnHandler = invokeHandlers?.get('pty:spawn')
        if (!spawnHandler) {
          return
        }
        global.__ptySpawnLog = []
        global.__ptySpawnSpyInstalled = true
        invokeHandlers?.set('pty:spawn', (event, args) => {
          const record = args as Record<string, unknown>
          global.__ptySpawnLog!.push({
            command: typeof record.command === 'string' ? record.command : '',
            ...(typeof record.launchAgent === 'string' ? { launchAgent: record.launchAgent } : {}),
            ...(typeof record.tabId === 'string' ? { tabId: record.tabId } : {}),
            ...(typeof record.startupCommandDelivery === 'string'
              ? { startupCommandDelivery: record.startupCommandDelivery }
              : {}),
            hasLaunchConfig: Boolean(record.launchConfig),
            argKeys: Object.keys(record)
          })
          return spawnHandler(event, args)
        })
      })
      return
    } catch (error) {
      if (attempt === SPY_INSTALL_ATTEMPTS) {
        throw error
      }
      // Why: Electron can recreate the evaluated main-world context during
      // startup; retry keeps setup deterministic without hiding real failures.
      await new Promise((resolve) => setTimeout(resolve, SPY_INSTALL_RETRY_MS))
    }
  }
}

export async function readTerminalPtySpawnLog(
  app: ElectronApplication
): Promise<PtySpawnLogEntry[]> {
  return app.evaluate(() => {
    const global = globalThis as unknown as { __ptySpawnLog?: PtySpawnLogEntry[] }
    return global.__ptySpawnLog ? [...global.__ptySpawnLog] : []
  })
}
