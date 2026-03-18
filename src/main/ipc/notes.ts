import { IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuid } from 'uuid'
import { IPC_CHANNELS, Note } from '../../shared/types'

const NOTES_DIR = path.join(os.homedir(), '.kanbai', 'notes-workspace')
const NOTES_IMAGES_DIR = path.join(os.homedir(), '.kanbai', 'notes-images')

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

function ensureNotesDir(): void {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true })
  }
}

function getNotesFilePath(workspaceId: string): string {
  return path.join(NOTES_DIR, `${workspaceId}.json`)
}

function ensureImagesDir(workspaceId: string): void {
  const dir = path.join(NOTES_IMAGES_DIR, workspaceId)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getImagePath(workspaceId: string, imageId: string): string {
  return path.join(NOTES_IMAGES_DIR, workspaceId, imageId)
}

function isValidImageId(imageId: string): boolean {
  return !imageId.includes('/') && !imageId.includes('\\') && !imageId.includes('..')
}

export function loadNotes(workspaceId: string): Note[] {
  const filePath = getNotesFilePath(workspaceId)
  if (!fs.existsSync(filePath)) return []
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as Note[]
  } catch {
    return []
  }
}

export function saveNotes(workspaceId: string, notes: Note[]): void {
  ensureNotesDir()
  const filePath = getNotesFilePath(workspaceId)
  fs.writeFileSync(filePath, JSON.stringify(notes, null, 2), 'utf-8')
}

export function registerNotesHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.NOTES_LIST,
    async (_event, { workspaceId }: { workspaceId: string }): Promise<Note[]> => {
      const notes = loadNotes(workspaceId)
      return notes.sort((a, b) => b.updatedAt - a.updatedAt)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.NOTES_CREATE,
    async (_event, { workspaceId, title, content }: { workspaceId: string; title: string; content: string }): Promise<Note> => {
      const notes = loadNotes(workspaceId)
      const note: Note = {
        id: uuid(),
        title: title || 'Untitled',
        content: content || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      notes.push(note)
      saveNotes(workspaceId, notes)
      return note
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.NOTES_UPDATE,
    async (_event, { workspaceId, id, title, content }: { workspaceId: string; id: string; title?: string; content?: string }): Promise<Note | null> => {
      const notes = loadNotes(workspaceId)
      const idx = notes.findIndex((n) => n.id === id)
      if (idx < 0) return null
      if (title !== undefined) notes[idx]!.title = title
      if (content !== undefined) notes[idx]!.content = content
      notes[idx]!.updatedAt = Date.now()
      saveNotes(workspaceId, notes)
      return notes[idx]!
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.NOTES_DELETE,
    async (_event, { workspaceId, id }: { workspaceId: string; id: string }): Promise<void> => {
      const notes = loadNotes(workspaceId)
      const filtered = notes.filter((n) => n.id !== id)
      saveNotes(workspaceId, filtered)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.NOTES_SAVE_IMAGE,
    async (
      _event,
      { workspaceId, imageData, mimeType }: { workspaceId: string; imageData: string; mimeType: string },
    ): Promise<{ imageId: string } | null> => {
      if (typeof workspaceId !== 'string' || !workspaceId) {
        throw new Error('Invalid workspaceId')
      }
      if (typeof imageData !== 'string' || !imageData) {
        throw new Error('Invalid imageData')
      }
      if (typeof mimeType !== 'string') {
        throw new Error('Invalid mimeType')
      }

      const extension = ALLOWED_MIME_TYPES[mimeType]
      if (!extension) {
        throw new Error(`Unsupported mime type: ${mimeType}. Allowed: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`)
      }

      const estimatedSize = Math.ceil(imageData.length * 0.75)
      if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
        throw new Error(`Image exceeds maximum size of 10MB (estimated ${Math.round(estimatedSize / 1024 / 1024)}MB)`)
      }

      ensureImagesDir(workspaceId)
      const imageId = `${uuid()}.${extension}`
      const filePath = getImagePath(workspaceId, imageId)
      const buffer = Buffer.from(imageData, 'base64')
      fs.writeFileSync(filePath, buffer)
      return { imageId }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.NOTES_LOAD_IMAGE,
    async (
      _event,
      { workspaceId, imageId }: { workspaceId: string; imageId: string },
    ): Promise<{ data: string; mimeType: string } | null> => {
      if (typeof workspaceId !== 'string' || !workspaceId) {
        throw new Error('Invalid workspaceId')
      }
      if (typeof imageId !== 'string' || !imageId) {
        throw new Error('Invalid imageId')
      }
      if (!isValidImageId(imageId)) {
        throw new Error('Invalid imageId: path traversal detected')
      }

      const filePath = getImagePath(workspaceId, imageId)
      if (!fs.existsSync(filePath)) return null

      const ext = path.extname(imageId).slice(1)
      const mimeEntry = Object.entries(ALLOWED_MIME_TYPES).find(([, e]) => e === ext)
      if (!mimeEntry) return null

      const buffer = fs.readFileSync(filePath)
      return { data: buffer.toString('base64'), mimeType: mimeEntry[0] }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.NOTES_DELETE_IMAGE,
    async (_event, { workspaceId, imageId }: { workspaceId: string; imageId: string }): Promise<void> => {
      if (typeof workspaceId !== 'string' || !workspaceId) {
        throw new Error('Invalid workspaceId')
      }
      if (typeof imageId !== 'string' || !imageId) {
        throw new Error('Invalid imageId')
      }
      if (!isValidImageId(imageId)) {
        throw new Error('Invalid imageId: path traversal detected')
      }

      const filePath = getImagePath(workspaceId, imageId)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    },
  )
}
