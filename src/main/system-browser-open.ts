import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { shell } from 'electron'

export function needsLinuxBrowserEnvRepair(
  env: NodeJS.ProcessEnv,
  waylandSocketExists: boolean
): boolean {
  if (env.XDG_SESSION_TYPE !== 'wayland' || !waylandSocketExists) {
    return false
  }
  // Why: snap Firefox inherits the X11 launcher env and dies with "cannot open display".
  return (
    !env.WAYLAND_DISPLAY || env.GDK_BACKEND === 'x11' || env.ELECTRON_OZONE_PLATFORM_HINT === 'x11'
  )
}

export function linuxBrowserLaunchEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next: NodeJS.ProcessEnv = { ...env }
  delete next.GDK_BACKEND
  delete next.ELECTRON_OZONE_PLATFORM_HINT
  if (!next.WAYLAND_DISPLAY) {
    next.WAYLAND_DISPLAY = 'wayland-0'
  }
  return next
}

function waylandSocketExists(env: NodeJS.ProcessEnv): boolean {
  const runtimeDir = env.XDG_RUNTIME_DIR
  return Boolean(runtimeDir && existsSync(`${runtimeDir}/wayland-0`))
}

function spawnXdgOpen(url: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('xdg-open', [url], {
      detached: true,
      stdio: 'ignore',
      env
    })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
}

export function openHttpUrlInSystemBrowser(url: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return Promise.resolve()
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return Promise.resolve()
  }
  const normalized = parsed.toString()
  if (
    process.platform === 'linux' &&
    needsLinuxBrowserEnvRepair(process.env, waylandSocketExists(process.env))
  ) {
    return spawnXdgOpen(normalized, linuxBrowserLaunchEnv(process.env)).catch(() =>
      shell.openExternal(normalized)
    )
  }
  return shell.openExternal(normalized)
}
