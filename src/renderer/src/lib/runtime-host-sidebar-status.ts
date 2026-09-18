import type { RuntimeEnvironmentStatus } from '@/store/slices/runtime-status'

/** Sidebar "server disconnected" chip. A missing probe is not offline — CLI
 *  pairing can show runtime worktrees before the GUI has listed environments. */
export function isRuntimeHostChipDisconnected(
  entry: RuntimeEnvironmentStatus | undefined
): boolean {
  return entry !== undefined && entry.status === null
}
