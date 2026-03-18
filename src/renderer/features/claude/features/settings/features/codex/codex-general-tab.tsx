import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '../../../../../../lib/i18n'
import { AI_PROVIDERS } from '../../../../../../../shared/types/ai-provider'
import { CardSelector } from '../../components/card-selector'
import { FeatureToggleGrid } from '../../components/feature-toggle-grid'
import { DEFAULT_CONFIG, parseToml, serializeToml, type CodexConfig } from './codex-config'

const ACCENT_COLOR = AI_PROVIDERS.codex.detectionColor
const SCOPE_STORAGE_KEY = 'kanbai:codexConfigScope'

interface Props {
  projectPath: string
  workspaceName?: string
}

type ConfigScope = 'project' | 'workspace' | 'global'

function getStoredScope(): ConfigScope | null {
  if (typeof window === 'undefined') return null
  const stored = window.sessionStorage.getItem(SCOPE_STORAGE_KEY)
  if (stored === 'project' || stored === 'workspace' || stored === 'global') {
    return stored
  }
  return null
}

export function CodexGeneralTab({ projectPath, workspaceName }: Props) {
  const { t } = useI18n()
  const [config, setConfig] = useState<CodexConfig>(DEFAULT_CONFIG)
  const [rawContent, setRawContent] = useState('')
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showRaw, setShowRaw] = useState(false)
  const [saved, setSaved] = useState(false)
  const [scope, setScope] = useState<ConfigScope>(() => {
    const stored = getStoredScope()
    if (stored === 'workspace' && !workspaceName) return 'project'
    return stored ?? (workspaceName ? 'workspace' : 'project')
  })
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceName) {
      setWorkspacePath(null)
      setScope((prev) => (prev === 'workspace' ? 'project' : prev))
      return
    }
    let cancelled = false
    window.kanbai.workspaceEnv.getPath(workspaceName).then((envPath) => {
      if (cancelled) return
      setWorkspacePath(envPath)
      setScope((prev) => {
        const stored = getStoredScope()
        if (prev === 'workspace' && !envPath) return 'project'
        if (!stored && envPath && prev === 'project') return 'workspace'
        return prev
      })
    }).catch(() => {
      if (cancelled) return
      setWorkspacePath(null)
      setScope((prev) => (prev === 'workspace' ? 'project' : prev))
    })
    return () => { cancelled = true }
  }, [workspaceName])

  useEffect(() => {
    window.sessionStorage.setItem(SCOPE_STORAGE_KEY, scope)
  }, [scope])

  const resolveScopedPath = useCallback(async (): Promise<string | null> => {
    if (scope === 'workspace') {
      if (workspacePath) return workspacePath
      if (!workspaceName) return null
      return window.kanbai.workspaceEnv.getPath(workspaceName)
    }
    return projectPath
  }, [projectPath, scope, workspaceName, workspacePath])

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      if (scope === 'global') {
        const check = await window.kanbai.codexConfig.checkGlobal()
        setExists(check.exists)
        if (check.exists) {
          const result = await window.kanbai.codexConfig.readGlobal()
          if (result.success && result.content) {
            setRawContent(result.content)
            setConfig(parseToml(result.content))
          } else {
            setRawContent('')
            setConfig(DEFAULT_CONFIG)
          }
        } else {
          setRawContent('')
          setConfig(DEFAULT_CONFIG)
        }
      } else {
        const targetPath = await resolveScopedPath()
        if (!targetPath) {
          setExists(false)
          setRawContent('')
          setConfig(DEFAULT_CONFIG)
          return
        }
        const check = await window.kanbai.codexConfig.check(targetPath)
        setExists(check.exists)
        if (check.exists) {
          const result = await window.kanbai.codexConfig.read(targetPath)
          if (result.success && result.content) {
            setRawContent(result.content)
            setConfig(parseToml(result.content))
          } else {
            setRawContent('')
            setConfig(DEFAULT_CONFIG)
          }
        } else {
          setRawContent('')
          setConfig(DEFAULT_CONFIG)
        }
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false)
    }
  }, [resolveScopedPath, scope])

  useEffect(() => { loadConfig() }, [loadConfig])

  const saveConfig = useCallback(async (newConfig: CodexConfig) => {
    setConfig(newConfig)
    const toml = serializeToml(newConfig)
    setRawContent(toml)
    if (scope === 'global') {
      await window.kanbai.codexConfig.writeGlobal(toml)
    } else {
      const targetPath = await resolveScopedPath()
      if (!targetPath) return
      await window.kanbai.codexConfig.write(targetPath, toml)
    }
    setExists(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [resolveScopedPath, scope])

  const saveRaw = useCallback(async () => {
    if (scope === 'global') {
      await window.kanbai.codexConfig.writeGlobal(rawContent)
    } else {
      const targetPath = await resolveScopedPath()
      if (!targetPath) return
      await window.kanbai.codexConfig.write(targetPath, rawContent)
    }
    setConfig(parseToml(rawContent))
    setExists(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [rawContent, resolveScopedPath, scope])

  const handleCreateConfig = useCallback(async () => {
    await saveConfig(DEFAULT_CONFIG)
  }, [saveConfig])

  const handleScopeChange = useCallback((newScope: ConfigScope) => {
    setScope(newScope)
    setConfig(DEFAULT_CONFIG)
    setRawContent('')
    setExists(false)
  }, [])

  if (loading) {
    return <div className="file-viewer-empty">{t('common.loading')}</div>
  }

  const scopeSelector = (
    <div className="cs-general-section">
      <div className="cs-general-card cs-agent-teams">
        <CardSelector
          label={t('codex.configScope')}
          options={[
            { value: 'project', label: t('codex.configScopeProject'), description: t('codex.configScopeProjectDesc') },
            ...(workspaceName
              ? [{ value: 'workspace', label: t('codex.configScopeWorkspace'), description: t('codex.configScopeWorkspaceDesc', { workspace: workspaceName ?? '' }) }]
              : []),
            { value: 'global', label: t('codex.configScopeGlobal'), description: t('codex.configScopeGlobalDesc') },
          ]}
          value={scope}
          onChange={(v) => handleScopeChange(v as ConfigScope)}
          accentColor={ACCENT_COLOR}
        />
      </div>
    </div>
  )

  if (!exists) {
    return (
      <div className="cs-general-tab">
        {scopeSelector}
        <div className="cs-general-section">
          <div className="claude-rules-section">
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>{t('codex.noConfig')}</p>
            <button className="modal-btn modal-btn--primary" onClick={handleCreateConfig}>
              {t('codex.createConfig')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const modelOptions = [
    { value: '', label: 'Default', description: 'gpt-5.4' },
    { value: 'gpt-5.4', label: 'GPT-5.4', description: t('codex.modelGpt54') },
    { value: 'gpt-5.3-codex', label: 'GPT-5.3 Codex', description: t('codex.modelGpt53Codex') },
    { value: 'gpt-5.2-codex', label: 'GPT-5.2 Codex', description: t('codex.modelGpt52Codex') },
    { value: 'gpt-5.1-codex-max', label: 'GPT-5.1 Codex Max', description: t('codex.modelGpt51CodexMax') },
    { value: 'gpt-5.2', label: 'GPT-5.2', description: t('codex.modelGpt52') },
    { value: 'gpt-5.1-codex-mini', label: 'GPT-5.1 Codex Mini', description: t('codex.modelGpt51CodexMini') },
  ]

  const approvalOptions = [
    { value: 'untrusted', label: 'Untrusted', description: t('codex.approvalUntrusted') },
    { value: 'on-request', label: 'On-request', description: t('codex.approvalOnRequest') },
    { value: 'never', label: 'Auto', description: t('codex.approvalNever') },
  ]

  const sandboxOptions = [
    { value: 'read-only', label: 'Read-only', description: t('codex.sandboxReadOnly') },
    { value: 'workspace-write', label: 'Workspace', description: t('codex.sandboxWorkspaceWrite') },
    { value: 'danger-full-access', label: 'Full access', description: t('codex.sandboxFullAccess') },
  ]

  const reasoningOptions = [
    { value: '', label: 'Default', description: t('codex.reasoningDefault') },
    { value: 'xhigh', label: 'Extra high', description: t('codex.reasoningXhigh') },
    { value: 'high', label: 'High', description: t('codex.reasoningHigh') },
    { value: 'medium', label: 'Medium', description: t('codex.reasoningMedium') },
    { value: 'low', label: 'Low', description: t('codex.reasoningLow') },
    { value: 'minimal', label: 'Minimal', description: t('codex.reasoningMinimal') },
  ]

  const personalityOptions = [
    { value: 'friendly', label: 'Friendly', description: t('codex.personalityFriendly') },
    { value: 'pragmatic', label: 'Pragmatic', description: t('codex.personalityPragmatic') },
    { value: 'none', label: 'None', description: t('codex.personalityNone') },
  ]

  const webSearchOptions = [
    { value: 'cached', label: 'Cached', description: t('codex.webSearchCached') },
    { value: 'live', label: 'Live', description: t('codex.webSearchLive') },
    { value: 'disabled', label: 'Disabled', description: t('codex.webSearchDisabled') },
  ]

  const serviceTierOptions = [
    { value: '', label: 'Default', description: t('codex.serviceTierDefault') },
    { value: 'fast', label: 'Fast', description: t('codex.serviceTierFast') },
    { value: 'flex', label: 'Flex', description: t('codex.serviceTierFlex') },
  ]

  const reasoningSummaryOptions = [
    { value: 'auto', label: 'Auto', description: t('codex.reasoningSummaryAuto') },
    { value: 'concise', label: 'Concise', description: t('codex.reasoningSummaryConcise') },
    { value: 'detailed', label: 'Detailed', description: t('codex.reasoningSummaryDetailed') },
    { value: 'none', label: 'None', description: t('codex.reasoningSummaryNone') },
  ]

  const fileOpenerOptions = [
    { value: '', label: 'None', description: t('codex.fileOpenerNone') },
    { value: 'vscode', label: 'VS Code', description: t('codex.fileOpenerVscode') },
    { value: 'cursor', label: 'Cursor', description: t('codex.fileOpenerCursor') },
    { value: 'windsurf', label: 'Windsurf', description: t('codex.fileOpenerWindsurf') },
    { value: 'vscode-insiders', label: 'VS Code Insiders', description: t('codex.fileOpenerVscodeInsiders') },
  ]

  const features = [
    {
      key: 'multiAgent',
      label: t('codex.featureMultiAgent'),
      description: t('codex.featureMultiAgentDesc'),
      active: config.multiAgent,
      onToggle: () => saveConfig({ ...config, multiAgent: !config.multiAgent }),
    },
    {
      key: 'undo',
      label: t('codex.featureUndo'),
      description: t('codex.featureUndoDesc'),
      active: config.undo,
      onToggle: () => saveConfig({ ...config, undo: !config.undo }),
    },
    {
      key: 'shellTool',
      label: t('codex.featureShellTool'),
      description: t('codex.featureShellToolDesc'),
      active: config.shellTool,
      onToggle: () => saveConfig({ ...config, shellTool: !config.shellTool }),
    },
    {
      key: 'shellSnapshot',
      label: t('codex.featureShellSnapshot'),
      description: t('codex.featureShellSnapshotDesc'),
      active: config.shellSnapshot,
      onToggle: () => saveConfig({ ...config, shellSnapshot: !config.shellSnapshot }),
    },
    {
      key: 'unifiedExec',
      label: t('codex.featureUnifiedExec'),
      description: t('codex.featureUnifiedExecDesc'),
      active: config.unifiedExec,
      onToggle: () => saveConfig({ ...config, unifiedExec: !config.unifiedExec }),
    },
    {
      key: 'quiet',
      label: t('codex.featureQuiet'),
      description: t('codex.featureQuietDesc'),
      active: config.quiet,
      onToggle: () => saveConfig({ ...config, quiet: !config.quiet }),
    },
    {
      key: 'disableProjectDoc',
      label: t('codex.featureDisableProjectDoc'),
      description: t('codex.featureDisableProjectDocDesc'),
      active: config.disableProjectDoc,
      onToggle: () => saveConfig({ ...config, disableProjectDoc: !config.disableProjectDoc }),
    },
    {
      key: 'history',
      label: t('codex.historyPersistence'),
      description: t('codex.historyPersistenceDesc'),
      active: config.historyPersistence === 'save-all',
      onToggle: () => saveConfig({ ...config, historyPersistence: config.historyPersistence === 'save-all' ? 'none' : 'save-all' }),
    },
  ]

  return (
    <div className="cs-general-tab">
      {scopeSelector}

      {/* Model */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.model')}</div>
        <div className="cs-general-card cs-agent-teams">
          <CardSelector
            label={t('codex.model')}
            options={modelOptions}
            value={config.model}
            onChange={(v) => saveConfig({ ...config, model: v })}
            accentColor={ACCENT_COLOR}
          />
        </div>
      </div>

      {/* Provider */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.provider')}</div>
        <div className="cs-general-card">
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>{t('codex.providerDesc')}</p>
          <input
            type="text"
            className="claude-md-editor"
            value={config.provider}
            onChange={(e) => saveConfig({ ...config, provider: e.target.value })}
            placeholder="openai (default)"
            style={{ fontFamily: 'monospace', fontSize: 12, padding: '6px 8px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Approval policy */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.approvalPolicy')}</div>
        <div className="cs-general-card cs-agent-teams">
          <CardSelector
            label={t('codex.approvalPolicy')}
            options={approvalOptions}
            value={config.approvalPolicy}
            onChange={(v) => saveConfig({ ...config, approvalPolicy: v })}
            accentColor={ACCENT_COLOR}
          />
        </div>
      </div>

      {/* Sandbox mode */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.sandboxMode')}</div>
        <div className="cs-general-card cs-agent-teams">
          <CardSelector
            label={t('codex.sandboxMode')}
            options={sandboxOptions}
            value={config.sandboxMode}
            onChange={(v) => saveConfig({ ...config, sandboxMode: v })}
            accentColor={ACCENT_COLOR}
          />
        </div>
      </div>

      {/* Personality */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.personality')}</div>
        <div className="cs-general-card cs-agent-teams">
          <CardSelector
            label={t('codex.personality')}
            options={personalityOptions}
            value={config.personality}
            onChange={(v) => saveConfig({ ...config, personality: v })}
            accentColor={ACCENT_COLOR}
          />
        </div>
      </div>

      {/* Reasoning effort */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.reasoning')}</div>
        <div className="cs-general-card cs-agent-teams">
          <CardSelector
            label={t('codex.reasoning')}
            options={reasoningOptions}
            value={config.reasoning}
            onChange={(v) => saveConfig({ ...config, reasoning: v })}
            accentColor={ACCENT_COLOR}
          />
        </div>
      </div>

      {/* Reasoning summary */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.reasoningSummary')}</div>
        <div className="cs-general-card cs-agent-teams">
          <CardSelector
            label={t('codex.reasoningSummary')}
            options={reasoningSummaryOptions}
            value={config.modelReasoningSummary}
            onChange={(v) => saveConfig({ ...config, modelReasoningSummary: v })}
            accentColor={ACCENT_COLOR}
          />
        </div>
      </div>

      {/* Web search */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.webSearch')}</div>
        <div className="cs-general-card cs-agent-teams">
          <CardSelector
            label={t('codex.webSearch')}
            options={webSearchOptions}
            value={config.webSearch}
            onChange={(v) => saveConfig({ ...config, webSearch: v })}
            accentColor={ACCENT_COLOR}
          />
        </div>
      </div>

      {/* Service tier */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.serviceTier')}</div>
        <div className="cs-general-card cs-agent-teams">
          <CardSelector
            label={t('codex.serviceTier')}
            options={serviceTierOptions}
            value={config.serviceTier}
            onChange={(v) => saveConfig({ ...config, serviceTier: v })}
            accentColor={ACCENT_COLOR}
          />
        </div>
      </div>

      {/* File opener */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.fileOpener')}</div>
        <div className="cs-general-card cs-agent-teams">
          <CardSelector
            label={t('codex.fileOpener')}
            options={fileOpenerOptions}
            value={config.fileOpener}
            onChange={(v) => saveConfig({ ...config, fileOpener: v })}
            accentColor={ACCENT_COLOR}
          />
        </div>
      </div>

      {/* Features */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.features')}</div>
        <div className="cs-general-card cs-agent-teams">
          <FeatureToggleGrid features={features} accentColor={ACCENT_COLOR} />
        </div>
      </div>

      {/* Commit attribution */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.commitAttribution')}</div>
        <div className="cs-general-card">
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>{t('codex.commitAttributionDesc')}</p>
          <input
            type="text"
            className="claude-md-editor"
            value={config.commitAttribution}
            onChange={(e) => saveConfig({ ...config, commitAttribution: e.target.value })}
            placeholder={t('codex.commitAttributionPlaceholder')}
            style={{ fontFamily: 'monospace', fontSize: 12, padding: '6px 8px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Notify command */}
      <div className="cs-general-section">
        <div className="cs-general-section-header">{t('codex.notifyCommand')}</div>
        <div className="cs-general-card">
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>{t('codex.notifyCommandDesc')}</p>
          <input
            type="text"
            className="claude-md-editor"
            value={config.notify}
            onChange={(e) => saveConfig({ ...config, notify: e.target.value })}
            placeholder='["python3", "/path/to/notify.py"]'
            style={{ fontFamily: 'monospace', fontSize: 12, padding: '6px 8px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Raw TOML editor */}
      <div className="cs-general-section">
        <div className="cs-general-section-header" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowRaw(!showRaw)}>
          {showRaw ? '▼' : '▶'} {t('codex.configRaw')}
        </div>
        {showRaw && (
          <div className="cs-general-card">
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8 }}>{t('codex.configRawDesc')}</p>
            <textarea
              className="claude-md-editor"
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              rows={16}
              spellCheck={false}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <button className="modal-btn modal-btn--primary" onClick={saveRaw}>
                {t('codex.saveConfig')}
              </button>
              {saved && <span style={{ color: 'var(--green)', fontSize: 12 }}>{t('codex.saved')}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
