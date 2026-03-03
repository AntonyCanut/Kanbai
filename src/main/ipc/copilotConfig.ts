import { IpcMain } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { IPC_CHANNELS } from '../../shared/types'

export function registerCopilotConfigHandlers(ipcMain: IpcMain): void {
  // Check if .copilot/config.json exists in a project
  ipcMain.handle(
    IPC_CHANNELS.COPILOT_CHECK_CONFIG,
    async (_event, { projectPath }: { projectPath: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      const configPath = path.join(projectPath, '.copilot', 'config.json')
      return { exists: fs.existsSync(configPath) }
    },
  )

  // Read .copilot/config.json
  ipcMain.handle(
    IPC_CHANNELS.COPILOT_READ_CONFIG,
    async (_event, { projectPath }: { projectPath: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      const configPath = path.join(projectPath, '.copilot', 'config.json')
      if (!fs.existsSync(configPath)) {
        return { success: true, content: '' }
      }
      try {
        const content = fs.readFileSync(configPath, 'utf-8')
        return { success: true, content }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    },
  )

  // Write .copilot/config.json
  ipcMain.handle(
    IPC_CHANNELS.COPILOT_WRITE_CONFIG,
    async (_event, { projectPath, config }: { projectPath: string; config: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      if (typeof config !== 'string') throw new Error('Invalid config content')
      const copilotDir = path.join(projectPath, '.copilot')
      try {
        if (!fs.existsSync(copilotDir)) {
          fs.mkdirSync(copilotDir, { recursive: true })
        }
        fs.writeFileSync(path.join(copilotDir, 'config.json'), config, 'utf-8')
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    },
  )

  // --- Copilot Instructions (memory) ---

  ipcMain.handle(
    IPC_CHANNELS.COPILOT_READ_INSTRUCTIONS,
    async (_event, { projectPath }: { projectPath: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      const filePath = path.join(projectPath, '.copilot', 'instructions.md')
      if (!fs.existsSync(filePath)) return null
      return fs.readFileSync(filePath, 'utf-8')
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.COPILOT_WRITE_INSTRUCTIONS,
    async (_event, { projectPath, content }: { projectPath: string; content: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      if (typeof content !== 'string') throw new Error('Invalid content')
      const copilotDir = path.join(projectPath, '.copilot')
      if (!fs.existsSync(copilotDir)) fs.mkdirSync(copilotDir, { recursive: true })
      fs.writeFileSync(path.join(copilotDir, 'instructions.md'), content, 'utf-8')
      return { success: true }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.COPILOT_READ_GLOBAL_INSTRUCTIONS,
    async () => {
      const filePath = path.join(os.homedir(), '.copilot', 'instructions.md')
      if (!fs.existsSync(filePath)) return null
      return fs.readFileSync(filePath, 'utf-8')
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.COPILOT_WRITE_GLOBAL_INSTRUCTIONS,
    async (_event, { content }: { content: string }) => {
      if (typeof content !== 'string') throw new Error('Invalid content')
      const copilotDir = path.join(os.homedir(), '.copilot')
      if (!fs.existsSync(copilotDir)) fs.mkdirSync(copilotDir, { recursive: true })
      fs.writeFileSync(path.join(copilotDir, 'instructions.md'), content, 'utf-8')
      return { success: true }
    },
  )

  // --- Copilot Skills (.agents/skills/*/SKILL.md) ---

  ipcMain.handle(
    IPC_CHANNELS.COPILOT_LIST_SKILLS,
    async (_event, { projectPath }: { projectPath: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      const skillsDir = path.join(projectPath, '.agents', 'skills')
      if (!fs.existsSync(skillsDir)) return []
      const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
      return entries
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md')))
        .map((e) => ({ name: e.name, dirname: e.name }))
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.COPILOT_READ_SKILL,
    async (_event, { projectPath, dirname }: { projectPath: string; dirname: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      if (typeof dirname !== 'string') throw new Error('Invalid dirname')
      const filePath = path.join(projectPath, '.agents', 'skills', path.basename(dirname), 'SKILL.md')
      if (!fs.existsSync(filePath)) return null
      return fs.readFileSync(filePath, 'utf-8')
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.COPILOT_WRITE_SKILL,
    async (_event, { projectPath, dirname, content }: { projectPath: string; dirname: string; content: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      if (typeof dirname !== 'string') throw new Error('Invalid dirname')
      if (typeof content !== 'string') throw new Error('Invalid content')
      const skillDir = path.join(projectPath, '.agents', 'skills', path.basename(dirname))
      if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true })
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf-8')
      return { success: true }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.COPILOT_DELETE_SKILL,
    async (_event, { projectPath, dirname }: { projectPath: string; dirname: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      if (typeof dirname !== 'string') throw new Error('Invalid dirname')
      const skillDir = path.join(projectPath, '.agents', 'skills', path.basename(dirname))
      if (fs.existsSync(skillDir)) fs.rmSync(skillDir, { recursive: true })
      return { success: true }
    },
  )
}
