export interface CodexConfig {
  model: string
  provider: string
  approvalPolicy: string
  sandboxMode: string
  webSearch: string
  multiAgent: boolean
  historyPersistence: string
  flex: boolean
  reasoning: string
  quiet: boolean
  disableProjectDoc: boolean
  personality: string
  serviceTier: string
  modelReasoningSummary: string
  fileOpener: string
  undo: boolean
  shellSnapshot: boolean
  unifiedExec: boolean
  shellTool: boolean
  commitAttribution: string
  notify: string
}

export const DEFAULT_CONFIG: CodexConfig = {
  model: '',
  provider: '',
  approvalPolicy: 'untrusted',
  sandboxMode: 'workspace-write',
  webSearch: 'cached',
  multiAgent: false,
  historyPersistence: 'save-all',
  flex: false,
  reasoning: '',
  quiet: false,
  disableProjectDoc: false,
  personality: 'friendly',
  serviceTier: '',
  modelReasoningSummary: 'auto',
  fileOpener: '',
  undo: true,
  shellSnapshot: false,
  unifiedExec: false,
  shellTool: true,
  commitAttribution: '',
  notify: '',
}

function parseSectionValues(sectionContent: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const line of sectionContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eqIdx = trimmed.indexOf('=')
    const key = trimmed.slice(0, eqIdx).trim()
    const rawVal = trimmed.slice(eqIdx + 1).trim()
    values[key] = rawVal.replace(/^["']|["']$/g, '')
  }
  return values
}

function parseBoolean(raw: string | undefined): boolean | undefined {
  if (raw === 'true') return true
  if (raw === 'false') return false
  return undefined
}

function parseWebSearch(raw: string | undefined): CodexConfig['webSearch'] | undefined {
  if (!raw) return undefined
  if (raw === 'disabled' || raw === 'false') return 'disabled'
  if (raw === 'cached' || raw === 'live') return raw
  if (raw === 'true') return 'cached'
  return undefined
}

export function parseToml(content: string): CodexConfig {
  const config = { ...DEFAULT_CONFIG }

  const topLevel = content.split(/^\[/m)[0] ?? content
  const topValues = parseSectionValues(topLevel)

  if (topValues.model) config.model = topValues.model
  if (topValues.provider) config.provider = topValues.provider
  if (topValues.approval_policy) config.approvalPolicy = topValues.approval_policy
  if (topValues.sandbox_mode) config.sandboxMode = topValues.sandbox_mode
  if (topValues.model_reasoning_effort) config.reasoning = topValues.model_reasoning_effort
  if (topValues.reasoning) config.reasoning = topValues.reasoning
  if (parseBoolean(topValues.quiet) !== undefined) config.quiet = parseBoolean(topValues.quiet) ?? false
  if (parseBoolean(topValues.disable_project_doc) !== undefined) config.disableProjectDoc = parseBoolean(topValues.disable_project_doc) ?? false
  if (topValues.personality) config.personality = topValues.personality
  if (topValues.service_tier) config.serviceTier = topValues.service_tier
  if (topValues.model_reasoning_summary) config.modelReasoningSummary = topValues.model_reasoning_summary
  if (topValues.file_opener) config.fileOpener = topValues.file_opener
  if (topValues.commit_attribution) config.commitAttribution = topValues.commit_attribution
  if (parseBoolean(topValues.flex) !== undefined) config.flex = parseBoolean(topValues.flex) ?? false
  const topWebSearch = parseWebSearch(topValues.web_search)
  if (topWebSearch) config.webSearch = topWebSearch

  const featuresMatch = content.match(/\[features\]([\s\S]*?)(?=\n\[|$)/)
  if (featuresMatch?.[1]) {
    const vals = parseSectionValues(featuresMatch[1])
    const webSearch = parseWebSearch(vals.web_search)
    if (webSearch) config.webSearch = webSearch
    if (parseBoolean(vals.multi_agent) !== undefined) config.multiAgent = parseBoolean(vals.multi_agent) ?? false
    if (parseBoolean(vals.undo) !== undefined) config.undo = parseBoolean(vals.undo) ?? true
    if (parseBoolean(vals.shell_snapshot) !== undefined) config.shellSnapshot = parseBoolean(vals.shell_snapshot) ?? false
    if (parseBoolean(vals.unified_exec) !== undefined) config.unifiedExec = parseBoolean(vals.unified_exec) ?? false
    if (parseBoolean(vals.shell_tool) !== undefined) config.shellTool = parseBoolean(vals.shell_tool) ?? true
    if (parseBoolean(vals.flex) !== undefined) config.flex = parseBoolean(vals.flex) ?? false
  }

  const historyMatch = content.match(/\[history\]([\s\S]*?)(?=\n\[|$)/)
  if (historyMatch?.[1]) {
    const vals = parseSectionValues(historyMatch[1])
    if (vals.persistence) config.historyPersistence = vals.persistence
    if (vals.notify) config.notify = vals.notify
  }

  return config
}

export function serializeToml(config: CodexConfig): string {
  const lines: string[] = []

  if (config.model) lines.push(`model = "${config.model}"`)
  if (config.provider) lines.push(`provider = "${config.provider}"`)
  lines.push(`approval_policy = "${config.approvalPolicy}"`)
  lines.push(`sandbox_mode = "${config.sandboxMode}"`)
  if (config.personality && config.personality !== 'friendly') lines.push(`personality = "${config.personality}"`)
  if (config.serviceTier) lines.push(`service_tier = "${config.serviceTier}"`)
  if (config.reasoning) lines.push(`model_reasoning_effort = "${config.reasoning}"`)
  if (config.modelReasoningSummary && config.modelReasoningSummary !== 'auto') lines.push(`model_reasoning_summary = "${config.modelReasoningSummary}"`)
  if (config.fileOpener) lines.push(`file_opener = "${config.fileOpener}"`)
  if (config.quiet) lines.push('quiet = true')
  if (config.disableProjectDoc) lines.push('disable_project_doc = true')
  if (config.commitAttribution) lines.push(`commit_attribution = "${config.commitAttribution}"`)

  lines.push('')
  lines.push('[features]')
  lines.push(`web_search = ${config.webSearch !== 'disabled'}`)
  lines.push(`multi_agent = ${config.multiAgent}`)
  if (!config.undo) lines.push('undo = false')
  if (config.shellSnapshot) lines.push('shell_snapshot = true')
  if (config.unifiedExec) lines.push('unified_exec = true')
  if (!config.shellTool) lines.push('shell_tool = false')
  if (config.flex) lines.push('flex = true')

  lines.push('')
  lines.push('[history]')
  lines.push(`persistence = "${config.historyPersistence}"`)
  if (config.notify) lines.push(`notify = ${config.notify}`)

  lines.push('')
  return lines.join('\n')
}
