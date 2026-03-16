<<<<<<< HEAD
// Re-export from settings — actual files live there
=======
>>>>>>> kanban/r-58
export { RulesManager } from '../settings/components/rules-manager'
export { SettingsFileHierarchy } from '../settings/components/settings-file-hierarchy'
export { RulesSidebar } from '../settings/features/rules/rules-sidebar'
export { RuleTreeView } from '../settings/features/rules/rule-tree-view'
export { RuleTreeItem } from '../settings/features/rules/rule-tree-item'
export { RuleContextMenu } from '../settings/features/rules/rule-context-menu'
export { RuleAuthorBadge } from '../settings/features/rules/rule-author-badge'
export { TemplateSection } from '../settings/features/rules/template-section'
export { useRulesDragDrop } from '../settings/features/rules/use-rules-drag-drop'
export { useRulesState } from '../settings/features/rules/use-rules-state'
export { buildRuleTree, sortTree, parseAuthorFrontmatter, updateAuthorFrontmatter } from '../settings/features/rules/tree-utils'
export type { DropPosition, DropTarget } from '../settings/features/rules/use-rules-drag-drop'
export type { SharedRule, Selection } from '../settings/features/rules/use-rules-state'
