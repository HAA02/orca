import { test, expect } from './helpers/orca-app'
import { waitForActiveWorktree, waitForSessionReady } from './helpers/store'
import {
  installTerminalPtySpawnSpy,
  readTerminalPtySpawnLog
} from './helpers/terminal-pty-spawn-spy'

// Verifies the renderer launch pipeline end-to-end: Orca must pin opencode to
// its catalog default model (deepseek v4.1 flash) even when the user has never
// opened the model picker.
test('launches opencode with the pinned deepseek v4.1 flash model', async ({
  orcaPage,
  electronApp
}) => {
  await waitForSessionReady(orcaPage)
  await waitForActiveWorktree(orcaPage)
  await installTerminalPtySpawnSpy(electronApp)

  await orcaPage.getByRole('button', { name: 'New tab' }).click({ force: true })
  const openCodeItem = orcaPage.getByRole('menuitem', { name: /^OpenCode/ })
  await expect(openCodeItem).toBeVisible({ timeout: 30_000 })
  await openCodeItem.click({ force: true })

  await expect
    .poll(
      async () => {
        const log = await readTerminalPtySpawnLog(electronApp)
        return log.find((entry) => entry.launchAgent === 'opencode')?.command ?? null
      },
      { timeout: 30_000, message: 'opencode was never spawned' }
    )
    .not.toBeNull()

  const log = await readTerminalPtySpawnLog(electronApp)
  const command = log.find((entry) => entry.launchAgent === 'opencode')?.command ?? ''
  expect(command).toContain('opencode')
  expect(command).toContain('opencode-go/deepseek-v4.1-flash')
})
