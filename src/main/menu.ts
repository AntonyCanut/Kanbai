import { Menu, shell } from 'electron'
import { createMainTranslator } from './i18n'
import { StorageService } from './services/storage'
import { IS_MAC } from '../shared/platform'
import { IPC_CHANNELS } from '../shared/types'
import type { BrowserWindow } from 'electron'

let getMainWindow: (() => BrowserWindow | null) | null = null

export function initMenu(windowGetter: () => BrowserWindow | null): void {
  getMainWindow = windowGetter
}

function sendMenuAction(action: string): void {
  getMainWindow?.()?.webContents.send(IPC_CHANNELS.MENU_ACTION, action)
}

export function buildApplicationMenu(): void {
  const storage = new StorageService()
  const locale = storage.getSettings().locale || 'fr'
  const t = createMainTranslator(locale)

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only — on Windows, Preferences is folded into File menu)
    ...(IS_MAC
      ? [
          {
            label: 'Kanbai',
            submenu: [
              { role: 'about' as const, label: t('menu.about') },
              { type: 'separator' as const },
              {
                label: t('menu.preferences'),
                accelerator: 'CmdOrCtrl+,',
                click: () => sendMenuAction('view:settings'),
              },
              { type: 'separator' as const },
              { role: 'hide' as const, label: t('menu.hide') },
              { role: 'hideOthers' as const, label: t('menu.hideOthers') },
              { role: 'unhide' as const, label: t('menu.unhide') },
              { type: 'separator' as const },
              { role: 'quit' as const, label: t('menu.quit') },
            ],
          } satisfies Electron.MenuItemConstructorOptions,
        ]
      : []),
    // File menu
    {
      label: t('menu.file'),
      submenu: [
        {
          label: t('menu.file.newWorkspace'),
          accelerator: 'CmdOrCtrl+N',
          click: () => sendMenuAction('workspace:new'),
        },
        {
          label: t('menu.file.newFromFolder'),
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => sendMenuAction('workspace:newFromFolder'),
        },
        { type: 'separator' },
        {
          label: t('menu.file.import'),
          click: () => sendMenuAction('workspace:import'),
        },
        {
          label: t('menu.file.export'),
          click: () => sendMenuAction('workspace:export'),
        },
        { type: 'separator' },
        // On Windows, Preferences goes in File menu (no macOS app menu)
        ...(!IS_MAC
          ? [
              {
                label: t('menu.preferences'),
                accelerator: 'CmdOrCtrl+,',
                click: () => sendMenuAction('view:settings'),
              },
              { type: 'separator' as const },
            ]
          : []),
        { role: 'close', label: t('menu.file.close') },
        // On Windows, add Quit at the end of File menu
        ...(!IS_MAC
          ? [
              { type: 'separator' as const },
              { role: 'quit' as const, label: t('menu.quit') },
            ]
          : []),
      ],
    },
    // Edit menu
    {
      label: t('menu.edit'),
      submenu: [
        { role: 'undo', label: t('menu.edit.undo') },
        { role: 'redo', label: t('menu.edit.redo') },
        { type: 'separator' },
        { role: 'cut', label: t('menu.edit.cut') },
        { role: 'copy', label: t('menu.edit.copy') },
        { role: 'paste', label: t('menu.edit.paste') },
        { role: 'selectAll', label: t('menu.edit.selectAll') },
      ],
    },
    // View menu
    {
      label: t('menu.view'),
      submenu: [
        {
          label: 'Terminal',
          accelerator: 'CmdOrCtrl+1',
          click: () => sendMenuAction('view:terminal'),
        },
        {
          label: 'Git',
          accelerator: 'CmdOrCtrl+2',
          click: () => sendMenuAction('view:git'),
        },
        {
          label: 'Kanban',
          accelerator: 'CmdOrCtrl+3',
          click: () => sendMenuAction('view:kanban'),
        },
        {
          label: 'Claude',
          accelerator: 'CmdOrCtrl+4',
          click: () => sendMenuAction('view:claude'),
        },
        {
          label: t('menu.view.database'),
          accelerator: 'CmdOrCtrl+5',
          click: () => sendMenuAction('view:database'),
        },
        {
          label: 'Notes',
          accelerator: 'CmdOrCtrl+6',
          click: () => sendMenuAction('view:notes'),
        },
        { type: 'separator' },
        {
          label: t('menu.view.commandPalette'),
          accelerator: 'CmdOrCtrl+K',
          click: () => sendMenuAction('commandPalette'),
        },
        {
          label: t('menu.view.quickSwitch'),
          accelerator: 'CmdOrCtrl+P',
          click: () => sendMenuAction('quickSwitch'),
        },
        {
          label: t('menu.view.globalSearch'),
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendMenuAction('view:search'),
        },
        { type: 'separator' },
        {
          label: t('menu.view.devTools'),
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => getMainWindow?.()?.webContents.toggleDevTools(),
        },
        { role: 'reload', label: t('menu.view.reload') },
        { role: 'forceReload', label: t('menu.view.forceReload') },
        { type: 'separator' },
        { role: 'resetZoom', label: t('menu.view.actualSize') },
        { role: 'zoomIn', label: t('menu.view.zoomIn') },
        { role: 'zoomOut', label: t('menu.view.zoomOut') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t('menu.view.fullscreen') },
      ],
    },
    // Window menu
    {
      label: t('menu.window'),
      role: 'window',
      submenu: [
        { role: 'minimize', label: t('menu.window.minimize') },
        { role: 'zoom', label: 'Zoom' },
        ...(IS_MAC
          ? [
              { type: 'separator' as const },
              { role: 'front' as const, label: t('menu.window.bringToFront') },
            ]
          : []),
      ],
    },
    // Help menu
    {
      label: t('menu.help'),
      role: 'help',
      submenu: [
        {
          label: t('menu.help.shortcuts'),
          click: () => sendMenuAction('view:shortcuts'),
        },
        { type: 'separator' },
        {
          label: t('menu.help.website'),
          click: () => shell.openExternal('https://github.com/AntonyCanut/Kanbai'),
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
