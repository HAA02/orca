#!/usr/bin/env node
// Why: `pnpm dev` restores node-pty before Electron starts, but the desktop
// `orca open` path does not. A missing build/Release/pty.node crashes the main
// process before any window exists.

import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const scriptPath = realpathSync(import.meta.filename)
const repoRoot = path.resolve(path.dirname(scriptPath), '..', '..')

export function findMissingDesktopNativeArtifact(root, platform = process.platform) {
  const nodePtyDir = path.join(root, 'node_modules', 'node-pty')
  if (!existsSync(nodePtyDir)) {
    return null
  }
  if (platform === 'win32') {
    const conpty = path.join(nodePtyDir, 'build', 'Release', 'conpty.node')
    const pty = path.join(nodePtyDir, 'build', 'Release', 'pty.node')
    return existsSync(conpty) || existsSync(pty) ? null : conpty
  }
  const required = [path.join(nodePtyDir, 'build', 'Release', 'pty.node')]
  if (platform === 'darwin') {
    required.push(path.join(nodePtyDir, 'build', 'Release', 'spawn-helper'))
  }
  return required.find((artifactPath) => !existsSync(artifactPath)) ?? null
}

export function launchesDesktopApp(argv) {
  const command = argv.find((arg) => !arg.startsWith('-'))
  return command === 'open' || command === 'serve'
}

function notify(summary, body, urgency = 'normal') {
  spawnSync('notify-send', ['-u', urgency, summary, body], { stdio: 'ignore' })
}

function restoreDesktopNativeRuntime() {
  const missing = findMissingDesktopNativeArtifact(repoRoot)
  if (!missing) {
    return 0
  }
  console.error(`[desktop-native] Restoring ${missing}`)
  notify('Orca', 'Restoring the terminal native module, then opening Orca.')
  const result = spawnSync(
    process.execPath,
    [path.join(path.dirname(scriptPath), 'ensure-native-runtime.mjs'), '--runtime=electron'],
    { cwd: repoRoot, stdio: 'inherit' }
  )
  if ((result.status ?? 1) !== 0) {
    notify('Orca', 'Could not restore node-pty. Orca was not started.', 'critical')
    return result.status ?? 1
  }
  if (findMissingDesktopNativeArtifact(repoRoot)) {
    notify('Orca', 'Could not restore node-pty. Orca was not started.', 'critical')
    return 1
  }
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exit(restoreDesktopNativeRuntime())
}
