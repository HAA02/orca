import type { AgentSessionOptionCatalog, CatalogModel } from './agent-session-option-catalog-types'

function hasModelFlag(tokens: readonly string[]): boolean {
  return tokens.some(
    (token) =>
      token === '-m' ||
      token === '--model' ||
      token.startsWith('-m=') ||
      (token.startsWith('-m') && !token.startsWith('--')) ||
      token.startsWith('--model=')
  )
}

function parseOpenCodeModels(stdout: string): CatalogModel[] {
  const seen = new Set<string>()
  const models: CatalogModel[] = []
  for (const line of stdout.split(/\r?\n/)) {
    const id = line.trim()
    if (!id || id.includes(' ') || seen.has(id)) {
      continue
    }
    seen.add(id)
    models.push({ id, label: id, options: [] })
  }
  return models
}

export const OPENCODE_DEFAULT_MODEL_ID = 'opencode-go/deepseek-v4.1-flash'

export const OPENCODE_SESSION_OPTION_CATALOG: AgentSessionOptionCatalog = {
  models: [
    {
      id: OPENCODE_DEFAULT_MODEL_ID,
      label: OPENCODE_DEFAULT_MODEL_ID,
      isDefault: true,
      options: []
    },
    { id: 'opencode-go/kimi-k3', label: 'opencode-go/kimi-k3', options: [] },
    { id: 'opencode-go/glm-5.2', label: 'opencode-go/glm-5.2', options: [] },
    { id: 'opencode-go/gpt-5.6-luna', label: 'opencode-go/gpt-5.6-luna', options: [] },
    { id: 'opencode/deepseek-v4-flash-free', label: 'opencode/deepseek-v4-flash-free', options: [] }
  ],
  // Why: Orca pins opencode to deepseek v4.1 flash on every launch, even before
  // the user touches the model picker.
  launchDefaultModel: true,
  modelApply: {
    launchArgs: (value) => ['--model', String(value)],
    agentArgsOverride: hasModelFlag
  },
  listModels: { command: 'opencode models', parse: parseOpenCodeModels }
}
