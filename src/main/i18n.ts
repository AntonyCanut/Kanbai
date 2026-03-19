import type { Locale } from '../shared/types'

const menuTranslations: Record<Locale, Record<string, string>> = {
  fr: {
    // App menu (macOS)
    'menu.about': 'A propos de Kanbai',
    'menu.preferences': 'Preferences...',
    'menu.hide': 'Masquer Kanbai',
    'menu.hideOthers': 'Masquer les autres',
    'menu.unhide': 'Tout afficher',
    'menu.quit': 'Quitter Kanbai',

    // File menu
    'menu.file': 'Fichier',
    'menu.file.newWorkspace': 'Nouveau workspace',
    'menu.file.newFromFolder': 'Workspace depuis un dossier...',
    'menu.file.import': 'Importer un workspace...',
    'menu.file.export': 'Exporter le workspace...',
    'menu.file.close': 'Fermer la fenetre',

    // Edit menu
    'menu.edit': 'Edition',
    'menu.edit.undo': 'Annuler',
    'menu.edit.redo': 'Retablir',
    'menu.edit.cut': 'Couper',
    'menu.edit.copy': 'Copier',
    'menu.edit.paste': 'Coller',
    'menu.edit.selectAll': 'Tout selectionner',

    // View menu
    'menu.view': 'Affichage',
    'menu.view.database': 'Base de donnees',
    'menu.view.commandPalette': 'Palette de commandes',
    'menu.view.quickSwitch': 'Changement rapide',
    'menu.view.globalSearch': 'Recherche globale',
    'menu.view.devTools': 'Outils de developpement',
    'menu.view.reload': 'Recharger',
    'menu.view.forceReload': 'Forcer le rechargement',
    'menu.view.actualSize': 'Taille reelle',
    'menu.view.zoomIn': 'Zoom avant',
    'menu.view.zoomOut': 'Zoom arriere',
    'menu.view.fullscreen': 'Plein ecran',

    // Window menu
    'menu.window': 'Fenetre',
    'menu.window.minimize': 'Reduire',
    'menu.window.bringToFront': 'Tout ramener au premier plan',

    // Help menu
    'menu.help': 'Aide',
    'menu.help.shortcuts': 'Raccourcis clavier',
    'menu.help.website': 'Site web Kanbai',
  },
  en: {
    // App menu (macOS)
    'menu.about': 'About Kanbai',
    'menu.preferences': 'Preferences...',
    'menu.hide': 'Hide Kanbai',
    'menu.hideOthers': 'Hide Others',
    'menu.unhide': 'Show All',
    'menu.quit': 'Quit Kanbai',

    // File menu
    'menu.file': 'File',
    'menu.file.newWorkspace': 'New Workspace',
    'menu.file.newFromFolder': 'Workspace from Folder...',
    'menu.file.import': 'Import Workspace...',
    'menu.file.export': 'Export Workspace...',
    'menu.file.close': 'Close Window',

    // Edit menu
    'menu.edit': 'Edit',
    'menu.edit.undo': 'Undo',
    'menu.edit.redo': 'Redo',
    'menu.edit.cut': 'Cut',
    'menu.edit.copy': 'Copy',
    'menu.edit.paste': 'Paste',
    'menu.edit.selectAll': 'Select All',

    // View menu
    'menu.view': 'View',
    'menu.view.database': 'Database',
    'menu.view.commandPalette': 'Command Palette',
    'menu.view.quickSwitch': 'Quick Switch',
    'menu.view.globalSearch': 'Global Search',
    'menu.view.devTools': 'Toggle Developer Tools',
    'menu.view.reload': 'Reload',
    'menu.view.forceReload': 'Force Reload',
    'menu.view.actualSize': 'Actual Size',
    'menu.view.zoomIn': 'Zoom In',
    'menu.view.zoomOut': 'Zoom Out',
    'menu.view.fullscreen': 'Toggle Full Screen',

    // Window menu
    'menu.window': 'Window',
    'menu.window.minimize': 'Minimize',
    'menu.window.bringToFront': 'Bring All to Front',

    // Help menu
    'menu.help': 'Help',
    'menu.help.shortcuts': 'Keyboard Shortcuts',
    'menu.help.website': 'Kanbai Website',
  },
}

export function createMainTranslator(locale: Locale): (key: string) => string {
  return (key: string): string => {
    return menuTranslations[locale]?.[key] ?? key
  }
}
