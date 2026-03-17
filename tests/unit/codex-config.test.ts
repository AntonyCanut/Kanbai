import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, parseToml, serializeToml } from '../../src/renderer/features/claude/features/settings/features/codex/codex-config'

describe('codex-config', () => {
  it('round-trips autonomous settings and feature flags', () => {
    const toml = serializeToml({
      ...DEFAULT_CONFIG,
      approvalPolicy: 'never',
      sandboxMode: 'danger-full-access',
      multiAgent: true,
      flex: true,
      unifiedExec: true,
      webSearch: 'cached',
      historyPersistence: 'none',
    })

    expect(toml).toContain('approval_policy = "never"')
    expect(toml).toContain('sandbox_mode = "danger-full-access"')
    expect(toml).toContain('web_search = true')
    expect(toml).toContain('multi_agent = true')
    expect(toml).toContain('flex = true')
    expect(toml).toContain('unified_exec = true')

    const parsed = parseToml(toml)
    expect(parsed.approvalPolicy).toBe('never')
    expect(parsed.sandboxMode).toBe('danger-full-access')
    expect(parsed.multiAgent).toBe(true)
    expect(parsed.flex).toBe(true)
    expect(parsed.unifiedExec).toBe(true)
    expect(parsed.webSearch).toBe('cached')
    expect(parsed.historyPersistence).toBe('none')
  })

  it('maps disabled web search from boolean TOML', () => {
    const parsed = parseToml(`
approval_policy = "untrusted"
sandbox_mode = "workspace-write"

[features]
web_search = false
`)

    expect(parsed.webSearch).toBe('disabled')
  })
})
