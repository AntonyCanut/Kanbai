import { IpcMain } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { IPC_CHANNELS } from '../../shared/types'

export function registerGeminiConfigHandlers(ipcMain: IpcMain): void {
  // Check if .gemini/settings.json exists in a project
  ipcMain.handle(
    IPC_CHANNELS.GEMINI_CHECK_CONFIG,
    async (_event, { projectPath }: { projectPath: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      const configPath = path.join(projectPath, '.gemini', 'settings.json')
      return { exists: fs.existsSync(configPath) }
    },
  )

  // Read .gemini/settings.json
  ipcMain.handle(
    IPC_CHANNELS.GEMINI_READ_CONFIG,
    async (_event, { projectPath }: { projectPath: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      const configPath = path.join(projectPath, '.gemini', 'settings.json')
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

  // Write .gemini/settings.json
  ipcMain.handle(
    IPC_CHANNELS.GEMINI_WRITE_CONFIG,
    async (_event, { projectPath, config }: { projectPath: string; config: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      if (typeof config !== 'string') throw new Error('Invalid config content')
      const geminiDir = path.join(projectPath, '.gemini')
      try {
        if (!fs.existsSync(geminiDir)) {
          fs.mkdirSync(geminiDir, { recursive: true })
        }
        fs.writeFileSync(path.join(geminiDir, 'settings.json'), config, 'utf-8')
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    },
  )

  // --- Gemini Memory (GEMINI.md) ---

  ipcMain.handle(
    IPC_CHANNELS.GEMINI_READ_MEMORY,
    async (_event, { projectPath }: { projectPath: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      const filePath = path.join(projectPath, 'GEMINI.md')
      if (!fs.existsSync(filePath)) return null
      return fs.readFileSync(filePath, 'utf-8')
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.GEMINI_WRITE_MEMORY,
    async (_event, { projectPath, content }: { projectPath: string; content: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      if (typeof content !== 'string') throw new Error('Invalid content')
      fs.writeFileSync(path.join(projectPath, 'GEMINI.md'), content, 'utf-8')
      return { success: true }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.GEMINI_READ_GLOBAL_MEMORY,
    async () => {
      const filePath = path.join(os.homedir(), '.gemini', 'GEMINI.md')
      if (!fs.existsSync(filePath)) return null
      return fs.readFileSync(filePath, 'utf-8')
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.GEMINI_WRITE_GLOBAL_MEMORY,
    async (_event, { content }: { content: string }) => {
      if (typeof content !== 'string') throw new Error('Invalid content')
      const geminiDir = path.join(os.homedir(), '.gemini')
      if (!fs.existsSync(geminiDir)) fs.mkdirSync(geminiDir, { recursive: true })
      fs.writeFileSync(path.join(geminiDir, 'GEMINI.md'), content, 'utf-8')
      return { success: true }
    },
  )

  // --- Gemini Skills (.agents/skills/*/SKILL.md) ---

  ipcMain.handle(
    IPC_CHANNELS.GEMINI_LIST_SKILLS,
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
    IPC_CHANNELS.GEMINI_READ_SKILL,
    async (_event, { projectPath, dirname }: { projectPath: string; dirname: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      if (typeof dirname !== 'string') throw new Error('Invalid dirname')
      const filePath = path.join(projectPath, '.agents', 'skills', path.basename(dirname), 'SKILL.md')
      if (!fs.existsSync(filePath)) return null
      return fs.readFileSync(filePath, 'utf-8')
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.GEMINI_WRITE_SKILL,
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
    IPC_CHANNELS.GEMINI_DELETE_SKILL,
    async (_event, { projectPath, dirname }: { projectPath: string; dirname: string }) => {
      if (typeof projectPath !== 'string') throw new Error('Invalid project path')
      if (typeof dirname !== 'string') throw new Error('Invalid dirname')
      const skillDir = path.join(projectPath, '.agents', 'skills', path.basename(dirname))
      if (fs.existsSync(skillDir)) fs.rmSync(skillDir, { recursive: true })
      return { success: true }
    },
  )
}
