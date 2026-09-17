export type CursorIdeCatalogParameter = { id: string; value: string }
export type CursorIdeCatalogEntry = { id: string; parameters: CursorIdeCatalogParameter[] }

function paramsMap(params: readonly CursorIdeCatalogParameter[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const item of params) {
    if (item.id) {
      out[item.id] = String(item.value ?? '')
    }
  }
  return out
}

function catalogEntriesFromSelected(selected: unknown): CursorIdeCatalogEntry[] {
  if (!Array.isArray(selected)) {
    return []
  }
  const entries: CursorIdeCatalogEntry[] = []
  for (const item of selected) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const modelId = String((item as { modelId?: unknown }).modelId ?? '').trim()
    if (!modelId || modelId === 'default' || modelId === 'auto') {
      continue
    }
    const rawParams = (item as { parameters?: unknown }).parameters
    const parameters = Array.isArray(rawParams)
      ? rawParams.filter(
          (param): param is CursorIdeCatalogParameter =>
            Boolean(param) && typeof param === 'object' && typeof param.id === 'string'
        )
      : []
    entries.push({ id: modelId, parameters })
  }
  return entries
}

export function parseCursorCliConfigCatalog(raw: unknown): CursorIdeCatalogEntry[] {
  if (!raw || typeof raw !== 'object') {
    return []
  }
  const catalog = new Map<string, CursorIdeCatalogParameter[]>()
  const config = raw as {
    modelParameters?: unknown
    selectedModel?: unknown
    modelSelectionHistory?: unknown
  }
  if (config.modelParameters && typeof config.modelParameters === 'object') {
    for (const [modelId, params] of Object.entries(config.modelParameters)) {
      if (!modelId || modelId === 'default') {
        continue
      }
      catalog.set(
        modelId,
        Array.isArray(params)
          ? params.filter(
              (param): param is CursorIdeCatalogParameter =>
                Boolean(param) && typeof param === 'object' && typeof param.id === 'string'
            )
          : []
      )
    }
  }
  for (const entry of catalogEntriesFromSelected(
    config.selectedModel ? [config.selectedModel] : []
  )) {
    catalog.set(entry.id, entry.parameters)
  }
  if (Array.isArray(config.modelSelectionHistory)) {
    for (const modelId of config.modelSelectionHistory) {
      const id = typeof modelId === 'string' ? modelId.trim() : ''
      if (id && id !== 'default' && id !== 'auto' && !catalog.has(id)) {
        catalog.set(id, [])
      }
    }
  }
  return [...catalog.entries()].map(([id, parameters]) => ({ id, parameters }))
}

export function parseCursorReactiveStorageCatalog(raw: unknown): CursorIdeCatalogEntry[] {
  if (!raw || typeof raw !== 'object') {
    return []
  }
  const catalog = new Map<string, CursorIdeCatalogParameter[]>()
  const aiSettings = (raw as { aiSettings?: unknown }).aiSettings
  if (!aiSettings || typeof aiSettings !== 'object') {
    return []
  }
  const settings = aiSettings as {
    modelOverrideEnabled?: unknown
    modelParameterPreferences?: unknown
    modelConfig?: unknown
  }
  if (Array.isArray(settings.modelOverrideEnabled)) {
    for (const modelId of settings.modelOverrideEnabled) {
      if (typeof modelId === 'string' && modelId.trim()) {
        catalog.set(modelId.trim(), [])
      }
    }
  }
  if (
    settings.modelParameterPreferences &&
    typeof settings.modelParameterPreferences === 'object'
  ) {
    for (const [modelId, pref] of Object.entries(settings.modelParameterPreferences)) {
      if (!modelId.trim()) {
        continue
      }
      const parameters =
        pref &&
        typeof pref === 'object' &&
        Array.isArray((pref as { parameters?: unknown }).parameters)
          ? ((pref as { parameters: CursorIdeCatalogParameter[] }).parameters ?? [])
          : []
      catalog.set(modelId.trim(), parameters)
    }
  }
  if (settings.modelConfig && typeof settings.modelConfig === 'object') {
    for (const cfg of Object.values(settings.modelConfig)) {
      if (!cfg || typeof cfg !== 'object') {
        continue
      }
      for (const entry of catalogEntriesFromSelected(
        (cfg as { selectedModels?: unknown }).selectedModels
      )) {
        if (!catalog.has(entry.id) || entry.parameters.length > 0) {
          catalog.set(entry.id, entry.parameters)
        }
      }
    }
  }
  return [...catalog.entries()].map(([id, parameters]) => ({ id, parameters }))
}

export function parseCursorAppliedModelConfig(raw: unknown): CursorIdeCatalogEntry[] {
  if (!raw || typeof raw !== 'object') {
    return []
  }
  return catalogEntriesFromSelected((raw as { selectedModels?: unknown }).selectedModels)
}

export function mergeCursorIdeCatalogEntries(
  ...groups: readonly CursorIdeCatalogEntry[][]
): CursorIdeCatalogEntry[] {
  const catalog = new Map<string, CursorIdeCatalogParameter[]>()
  for (const group of groups) {
    for (const entry of group) {
      if (!catalog.has(entry.id) || entry.parameters.length > 0) {
        catalog.set(entry.id, entry.parameters)
      }
    }
  }
  return [...catalog.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, parameters]) => ({ id, parameters }))
}

export function resolveCursorCatalogModel(
  catalogId: string,
  params: readonly CursorIdeCatalogParameter[],
  cliModels: readonly string[]
): string | undefined {
  const id = catalogId.trim()
  if (!id) {
    return undefined
  }
  const cliSet = new Set(cliModels)
  const pmap = paramsMap(params)
  const effort = (pmap.effort ?? 'high').toLowerCase()
  const fast = ['true', '1', 'yes'].includes((pmap.fast ?? 'false').toLowerCase())
  if (cliSet.has(id)) {
    const fastVariant = `${id}-fast`
    return fast && cliSet.has(fastVariant) ? fastVariant : id
  }
  const prefixes = id.includes('grok') && !id.startsWith('cursor-') ? [id, `cursor-${id}`] : [id]
  const variants: string[] = []
  for (const prefix of prefixes) {
    for (const stem of [`${prefix}-thinking-${effort}`, `${prefix}-${effort}`, prefix]) {
      if (fast) {
        variants.push(`${stem}-fast`)
      }
      variants.push(stem)
    }
  }
  const exact = variants.find((candidate) => cliSet.has(candidate))
  if (exact) {
    return exact
  }
  const prefixMatches = cliModels.filter(
    (model) => model === id || model.startsWith(`${id}-`) || model.startsWith(`cursor-${id}-`)
  )
  if (prefixMatches.length === 0) {
    return undefined
  }
  return prefixMatches.reduce((best, model) => {
    return scoreCursorCliMatch(model, effort, fast) > scoreCursorCliMatch(best, effort, fast)
      ? model
      : best
  })
}

function scoreCursorCliMatch(model: string, effort: string, fast: boolean): number {
  let points = 0
  if (model.includes(`-${effort}`)) {
    points += 12
  }
  if (fast && model.endsWith('-fast')) {
    points += 10
  }
  if (!fast && !model.endsWith('-fast')) {
    points += 4
  }
  if (effort === 'high' && model.endsWith('-high')) {
    points += 6
  }
  if (model.includes('-thinking-') && model.includes(effort)) {
    points += 5
  }
  return points
}

export function listCursorAccountCatalogModels(
  accountCliIds: readonly string[],
  enabledCliIds: readonly string[] = []
): { id: string; label: string }[] {
  const seen = new Set<string>()
  const models: { id: string; label: string }[] = []
  for (const raw of accountCliIds) {
    const id = raw.trim()
    if (!id || id.toLowerCase() === 'default' || seen.has(id)) {
      continue
    }
    seen.add(id)
    models.push({ id, label: id === 'auto' ? 'Auto' : id })
  }
  return preferCursorIdeCliModels(models, enabledCliIds)
}

export function preferCursorIdeCliModels<T extends { id: string }>(
  discovered: readonly T[],
  enabledCliIds: readonly string[]
): T[] {
  if (enabledCliIds.length === 0) {
    return [...discovered]
  }
  const byId = new Map(discovered.map((model) => [model.id, model]))
  const preferred = enabledCliIds
    .map((id) => byId.get(id))
    .filter((model): model is T => model !== undefined)
  if (preferred.length === 0) {
    return [...discovered]
  }
  const preferredIds = new Set(preferred.map((model) => model.id))
  const auto = discovered.find((model) => model.id === 'auto')
  const rest = discovered.filter((model) => model.id !== 'auto' && !preferredIds.has(model.id))
  const preferredWithoutAuto = preferred.filter((model) => model.id !== 'auto')
  return auto ? [auto, ...preferredWithoutAuto, ...rest] : [...preferredWithoutAuto, ...rest]
}

export function resolveEnabledCursorCliModels(
  catalog: readonly CursorIdeCatalogEntry[],
  accountCliModels: readonly string[]
): string[] {
  const enabled: string[] = []
  for (const entry of catalog) {
    const resolved = resolveCursorCatalogModel(entry.id, entry.parameters, accountCliModels)
    if (resolved && !enabled.includes(resolved)) {
      enabled.push(resolved)
    }
  }
  return enabled
}
