import fs from 'fs'
import path from 'path'
import { BrowserWindow } from 'electron'
import { StorageService } from '../../services/storage'
import { IPC_CHANNELS } from '../../../shared/types'
import type { CompanionFeature, CompanionContext, CompanionResult, CompanionCommandDef } from '../../../shared/types/companion'

function parseMakeTargets(projectPath: string): string[] {
  const makefilePath = path.join(projectPath, 'Makefile')
  if (!fs.existsSync(makefilePath)) return []
  try {
    const content = fs.readFileSync(makefilePath, 'utf-8')
    const phonyRegex = /^\.PHONY\s*:\s*(.+)$/gm
    const phonyTargets = new Set<string>()
    let phonyMatch: RegExpExecArray | null
    while ((phonyMatch = phonyRegex.exec(content)) !== null) {
      for (const t of phonyMatch[1]!.trim().split(/\s+/)) {
        phonyTargets.add(t)
      }
    }
    if (phonyTargets.size > 0) return [...phonyTargets]
    const targetRegex = /^([a-zA-Z_][\w-]*)\s*:/gm
    const targets: string[] = []
    let match: RegExpExecArray | null
    while ((match = targetRegex.exec(content)) !== null) {
      targets.push(match[1]!)
    }
    return targets
  } catch {
    return []
  }
}

export const projectFeature: CompanionFeature = {
  id: 'project',
  name: 'Projects',
  workspaceScoped: true,
  projectScoped: false,

  async getState(ctx: CompanionContext): Promise<CompanionResult> {
    const storage = new StorageService()
    const projects = storage.getProjects(ctx.workspaceId)
    return {
      success: true,
      data: projects.map((p) => ({
        id: p.id,
        name: p.name,
        path: p.path,
        workspaceId: p.workspaceId,
      })),
    }
  },

  getCommands(): CompanionCommandDef[] {
    return [
      {
        name: 'get',
        description: 'Get a project by ID',
        params: {
          id: { type: 'string', required: true, description: 'Project ID' },
        },
      },
      {
        name: 'listMakeTargets',
        description: 'List available Makefile targets for a project',
        params: {
          projectId: { type: 'string', required: true, description: 'Project ID' },
        },
      },
      {
        name: 'runMakeTarget',
        description: 'Run a Makefile target in a new terminal',
        params: {
          projectId: { type: 'string', required: true, description: 'Project ID' },
          target: { type: 'string', required: true, description: 'Make target name' },
        },
      },
    ]
  },

  async execute(command: string, params: Record<string, unknown>, ctx: CompanionContext): Promise<CompanionResult> {
    const storage = new StorageService()

    if (command === 'get') {
      const id = params.id as string
      if (!id) return { success: false, error: 'Missing project id' }
      const project = storage.getProjects(ctx.workspaceId).find((p) => p.id === id)
      if (!project) return { success: false, error: `Project not found: ${id}` }
      return { success: true, data: project }
    }

    if (command === 'listMakeTargets') {
      const projectId = params.projectId as string
      if (!projectId) return { success: false, error: 'Missing projectId' }
      const project = storage.getProjects(ctx.workspaceId).find((p) => p.id === projectId)
      if (!project) return { success: false, error: `Project not found: ${projectId}` }
      const targets = parseMakeTargets(project.path)
      return { success: true, data: { projectId, projectName: project.name, targets } }
    }

    if (command === 'runMakeTarget') {
      const projectId = params.projectId as string
      const target = params.target as string
      if (!projectId) return { success: false, error: 'Missing projectId' }
      if (!target) return { success: false, error: 'Missing target' }
      const project = storage.getProjects(ctx.workspaceId).find((p) => p.id === projectId)
      if (!project) return { success: false, error: `Project not found: ${projectId}` }
      // Validate target exists
      const targets = parseMakeTargets(project.path)
      if (!targets.includes(target)) return { success: false, error: `Unknown make target: ${target}` }
      // Notify renderer to create a terminal and run the make command
      for (const win of BrowserWindow.getAllWindows()) {
        try {
          if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.TERMINAL_COMPANION_CREATE, {
              provider: null,
              workspaceId: ctx.workspaceId,
              makeTarget: target,
              projectPath: project.path,
              projectName: project.name,
            })
          }
        } catch { /* window destroyed */ }
      }
      return { success: true, data: { projectId, target } }
    }

    return { success: false, error: `Unknown command: ${command}` }
  },
}
