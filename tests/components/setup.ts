import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup DOM after each test
afterEach(() => {
  cleanup()
})

// Polyfill scrollIntoView for jsdom (not supported natively)
Element.prototype.scrollIntoView = vi.fn()

// Mock window.mirehub global API (Electron preload bridge)
// Use Object.defineProperty to add to the existing jsdom window without replacing it
const mockMirehub = {
  settings: {
    get: vi.fn().mockResolvedValue({
      theme: 'dark',
      locale: 'fr',
      defaultShell: '/bin/zsh',
      fontSize: 13,
      fontFamily: 'Menlo',
      scrollbackLines: 5000,
      claudeDetectionColor: '#7c3aed',
      autoClauderEnabled: false,
      notificationSound: true,
      notificationBadge: true,
      checkUpdatesOnLaunch: true,
      autoCloseCompletedTerminals: false,
      autoCloseCtoTerminals: true,
      autoApprove: true,
      tutorialCompleted: false,
      tutorialSeenSections: [],
    }),
    set: vi.fn().mockResolvedValue(undefined),
  },
  fs: {
    readDir: vi.fn().mockResolvedValue([]),
    rename: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
    copy: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
  kanban: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    watch: vi.fn(),
    unwatch: vi.fn(),
    onFileChanged: vi.fn().mockReturnValue(() => {}),
    writePrompt: vi.fn(),
    listPromptTemplates: vi.fn().mockResolvedValue([]),
    attachFiles: vi.fn(),
    attachFromClipboard: vi.fn(),
    removeAttachment: vi.fn(),
    listAttachments: vi.fn().mockResolvedValue([]),
    selectFiles: vi.fn().mockResolvedValue([]),
    attachFile: vi.fn().mockResolvedValue(undefined),
    watchRemove: vi.fn(),
  },
  gitConfig: {
    get: vi.fn().mockResolvedValue({ userName: '', userEmail: '', isCustom: false }),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  ssh: {
    listKeys: vi.fn().mockResolvedValue({ success: true, keys: [] }),
    generateKey: vi.fn(),
    importKey: vi.fn(),
    deleteKey: vi.fn(),
    selectKeyFile: vi.fn(),
    readPublicKey: vi.fn(),
    openDirectory: vi.fn(),
  },
  namespace: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ensureDefault: vi.fn().mockResolvedValue(undefined),
  },
  app: {
    version: vi.fn().mockResolvedValue({ version: '0.1.0', name: 'Mirehub' }),
    checkForUpdate: vi.fn(),
  },
  workspace: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  project: {
    list: vi.fn().mockResolvedValue([]),
    selectDir: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    scanClaude: vi.fn(),
  },
  workspaceEnv: {
    setup: vi.fn(),
    getPath: vi.fn(),
    delete: vi.fn(),
  },
  prompts: {
    list: vi.fn().mockResolvedValue([]),
  },
}

// Add mirehub to the jsdom window without replacing the whole window object
Object.defineProperty(window, 'mirehub', {
  value: mockMirehub,
  writable: true,
  configurable: true,
})
