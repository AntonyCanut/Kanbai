import { IpcMain, shell } from 'electron'
import fs, { createReadStream } from 'fs'
import path from 'path'
import { createInterface } from 'readline'
import { execFile } from 'child_process'
import { IPC_CHANNELS, FileEntry, SearchResult } from '../../shared/types'

export function registerFilesystemHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.FS_READ_DIR, async (_event, { path: dirPath }: { path: string }) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      const result: FileEntry[] = []

      for (const entry of entries) {
        try {
          const fullPath = path.join(dirPath, entry.name)
          const fileEntry: FileEntry = {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            isSymlink: entry.isSymbolicLink(),
          }
          try {
            const stat = fs.statSync(fullPath)
            fileEntry.size = stat.size
            fileEntry.modifiedAt = stat.mtimeMs
          } catch {
            // stat may fail for broken symlinks, keep entry without size/modifiedAt
          }
          result.push(fileEntry)
        } catch {
          // Skip entries that can't be stat'd (broken symlinks, etc.)
        }
      }

      result.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return result
    } catch {
      return []
    }
  })

  ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, async (_event, { path: filePath }: { path: string }) => {
    try {
      const stat = fs.statSync(filePath)
      if (stat.size > 5 * 1024 * 1024) {
        return { content: null, error: null, isLargeFile: true, fileSize: stat.size }
      }
      const content = fs.readFileSync(filePath, 'utf-8')
      return { content, error: null }
    } catch (err) {
      return { content: null, error: String(err) }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.FS_WRITE_FILE,
    async (_event, { path: filePath, content }: { path: string; content: string }) => {
      try {
        fs.writeFileSync(filePath, content, 'utf-8')
        return { success: true, error: null }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.FS_RENAME,
    async (_event, { oldPath, newPath }: { oldPath: string; newPath: string }) => {
      fs.renameSync(oldPath, newPath)
      return true
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.FS_DELETE,
    async (_event, { path: targetPath }: { path: string }) => {
      fs.rmSync(targetPath, { recursive: true, force: true })
      return true
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.FS_COPY,
    async (_event, { src, dest }: { src: string; dest: string }) => {
      fs.cpSync(src, dest, { recursive: true })
      return true
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.FS_MKDIR,
    async (_event, { path: targetPath }: { path: string }) => {
      fs.mkdirSync(targetPath, { recursive: true })
      return true
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.FS_EXISTS,
    async (_event, { path: targetPath }: { path: string }) => {
      return fs.existsSync(targetPath)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.FS_READ_BASE64,
    async (_event, { path: filePath }: { path: string }) => {
      try {
        const stat = fs.statSync(filePath)
        if (stat.size > 20 * 1024 * 1024) {
          return { data: null, error: 'Fichier trop volumineux (>20 Mo)' }
        }
        const buffer = fs.readFileSync(filePath)
        const base64 = buffer.toString('base64')
        const ext = path.extname(filePath).toLowerCase()
        const mimeTypes: Record<string, string> = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.ico': 'image/x-icon',
          '.webp': 'image/webp',
          '.bmp': 'image/bmp',
          '.svg': 'image/svg+xml',
          '.pdf': 'application/pdf',
        }
        const mime = mimeTypes[ext] || 'application/octet-stream'
        return { data: `data:${mime};base64,${base64}`, error: null }
      } catch (err) {
        return { data: null, error: String(err) }
      }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.FS_OPEN_IN_FINDER,
    async (_event, { path: targetPath }: { path: string }) => {
      shell.showItemInFolder(targetPath)
      return true
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.FS_SEARCH,
    async (
      _event,
      { cwd, query, fileTypes, caseSensitive }: { cwd: string; query: string; fileTypes?: string[]; caseSensitive?: boolean },
    ): Promise<SearchResult[]> => {
      if (!query || query.trim().length === 0) return []

      return new Promise((resolve) => {
        const args: string[] = [
          '-r',
          '-n',
          '--column',
          '--line-buffered',
        ]

        if (!caseSensitive) {
          args.push('-i')
        }

        // Exclude common directories
        const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', '.cache', 'coverage']
        for (const dir of excludeDirs) {
          args.push(`--exclude-dir=${dir}`)
        }

        // File type filter
        if (fileTypes && fileTypes.length > 0) {
          for (const ft of fileTypes) {
            args.push(`--include=*.${ft}`)
          }
        }

        args.push('--', query, '.')

        const proc = execFile('grep', args, { cwd, maxBuffer: 10 * 1024 * 1024, timeout: 10000 }, (err, stdout) => {
          if (err || !stdout) {
            resolve([])
            return
          }

          const results: SearchResult[] = []
          const lines = stdout.split('\n')
          const limit = 200

          for (const line of lines) {
            if (results.length >= limit) break
            if (!line.trim()) continue

            // grep --column output format: ./file:line:column:text
            const match = line.match(/^\.\/(.+?):(\d+):(\d+):(.*)$/)
            if (match) {
              results.push({
                file: path.join(cwd, match[1]!),
                line: parseInt(match[2]!, 10),
                column: parseInt(match[3]!, 10),
                text: match[4]!,
              })
            }
          }

          resolve(results)
        })

        proc.on('error', () => resolve([]))
      })
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.FS_FILE_INFO,
    async (_event, { path: filePath }: { path: string }) => {
      try {
        const stat = fs.statSync(filePath)

        // Check if binary by reading first 8KB and looking for null bytes
        let isBinary = false
        const checkSize = Math.min(stat.size, 8192)
        if (checkSize > 0) {
          const fd = fs.openSync(filePath, 'r')
          const buffer = Buffer.alloc(checkSize)
          fs.readSync(fd, buffer, 0, checkSize, 0)
          fs.closeSync(fd)
          for (let i = 0; i < checkSize; i++) {
            if (buffer[i] === 0x00) {
              isBinary = true
              break
            }
          }
        }

        // Count lines efficiently using streaming
        let lineCount = 0
        if (!isBinary && stat.size > 0) {
          const stream = createReadStream(filePath)
          for await (const chunk of stream) {
            const buf = chunk as Buffer
            for (let i = 0; i < buf.length; i++) {
              if (buf[i] === 0x0a) lineCount++
            }
          }
          // Add 1 if file doesn't end with newline (file has content but no trailing newline)
          const fd = fs.openSync(filePath, 'r')
          const lastByte = Buffer.alloc(1)
          fs.readSync(fd, lastByte, 0, 1, stat.size - 1)
          fs.closeSync(fd)
          if (lastByte[0] !== 0x0a) {
            lineCount++
          }
        }

        return {
          size: stat.size,
          lineCount,
          encoding: 'utf-8' as const,
          isBinary,
          error: null,
        }
      } catch (err) {
        return {
          size: 0,
          lineCount: 0,
          encoding: 'utf-8' as const,
          isBinary: false,
          error: String(err),
        }
      }
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.FS_READ_FILE_CHUNKED,
    async (
      _event,
      { path: filePath, startLine, lineCount = 1000 }: { path: string; startLine: number; lineCount?: number },
    ) => {
      try {
        const stat = fs.statSync(filePath)

        // Count total lines efficiently
        let totalLines = 0
        const countStream = createReadStream(filePath)
        for await (const chunk of countStream) {
          const buf = chunk as Buffer
          for (let i = 0; i < buf.length; i++) {
            if (buf[i] === 0x0a) totalLines++
          }
        }
        // Add 1 if file doesn't end with newline
        if (stat.size > 0) {
          const fd = fs.openSync(filePath, 'r')
          const lastByte = Buffer.alloc(1)
          fs.readSync(fd, lastByte, 0, 1, stat.size - 1)
          fs.closeSync(fd)
          if (lastByte[0] !== 0x0a) {
            totalLines++
          }
        }

        // Read the requested line range using readline for efficient line-by-line streaming
        const lines: string[] = []
        let currentLine = 0
        const endTarget = startLine + lineCount

        const rl = createInterface({
          input: createReadStream(filePath, { encoding: 'utf-8' }),
          crlfDelay: Infinity,
        })

        for await (const line of rl) {
          if (currentLine >= endTarget) {
            rl.close()
            break
          }
          if (currentLine >= startLine) {
            lines.push(line)
          }
          currentLine++
        }

        const actualEndLine = startLine + lines.length

        return {
          content: lines.join('\n'),
          startLine,
          endLine: actualEndLine,
          totalLines,
          error: null,
        }
      } catch (err) {
        return {
          content: null,
          startLine: 0,
          endLine: 0,
          totalLines: 0,
          error: String(err),
        }
      }
    },
  )
}
