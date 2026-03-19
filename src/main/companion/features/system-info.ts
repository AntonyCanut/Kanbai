import os from 'os'
import type { CompanionFeature, CompanionContext, CompanionResult, CompanionCommandDef } from '../../../shared/types/companion'
import { getAvailableShells, getDefaultShell, IS_MAC, IS_WIN } from '../../../shared/platform'

function getPlatformLabel(): string {
  if (IS_MAC) return 'macOS'
  if (IS_WIN) return 'Windows'
  return 'Linux'
}

export const systemInfoFeature: CompanionFeature = {
  id: 'system-info',
  name: 'System Info',
  workspaceScoped: false,
  projectScoped: false,

  async getState(_ctx: CompanionContext): Promise<CompanionResult> {
    return {
      success: true,
      data: {
        platform: process.platform,
        platformLabel: getPlatformLabel(),
        arch: process.arch,
        hostname: os.hostname(),
        defaultShell: getDefaultShell(),
        availableShells: getAvailableShells(),
      },
    }
  },

  getCommands(): CompanionCommandDef[] {
    return [
      {
        name: 'getAvailableShells',
        description: 'Get available shell/terminal types for the host platform',
        params: {},
      },
    ]
  },

  async execute(command: string, _params: Record<string, unknown>, _ctx: CompanionContext): Promise<CompanionResult> {
    if (command === 'getAvailableShells') {
      return {
        success: true,
        data: {
          platform: process.platform,
          platformLabel: getPlatformLabel(),
          defaultShell: getDefaultShell(),
          shells: getAvailableShells(),
        },
      }
    }

    return { success: false, error: `Unknown command: ${command}` }
  },
}
