import { getTerminalSessionsInfo } from '../../ipc/terminal'
import type { CompanionFeature, CompanionContext, CompanionResult, CompanionCommandDef } from '../../../shared/types/companion'

function formatElapsed(createdAt: number): string {
  const seconds = Math.floor((Date.now() - createdAt) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`
}

export const terminalFeature: CompanionFeature = {
  id: 'terminal-sessions',
  name: 'Terminal Sessions',
  workspaceScoped: true,
  projectScoped: false,

  async getState(ctx: CompanionContext): Promise<CompanionResult> {
    const sessions = getTerminalSessionsInfo()

    // Filter by workspace if provided
    const filtered = ctx.workspaceId
      ? sessions.filter((s) => s.workspaceId === ctx.workspaceId || !s.workspaceId)
      : sessions

    return {
      success: true,
      data: filtered.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        elapsed: formatElapsed(s.createdAt),
      })),
    }
  },

  getCommands(): CompanionCommandDef[] {
    return []
  },

  async execute(command: string, _params: Record<string, unknown>, _ctx: CompanionContext): Promise<CompanionResult> {
    return { success: false, error: `Unknown command: ${command}` }
  },
}
