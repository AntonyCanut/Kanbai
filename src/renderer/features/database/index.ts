// Database feature barrel export
export { DatabaseExplorer } from './database-explorer'
export { useDatabaseStore } from './database-store'
export { useDatabaseTabStore } from './database-tab-store'
export type { DbQueryTab } from './database-tab-store'
export { useDatabase } from './use-database'

// Query sub-feature
export { DatabaseQueryArea, clampPanelHeight } from './features/query/query-area'
export { DatabaseResultsTable } from './features/query/results-table'
export { DatabaseTabBar } from './features/query/tab-bar'

// NL Chat sub-feature
export { DatabaseNLChat } from './features/nl-chat/nl-chat'

// Connection sub-feature
export { DatabaseSidebar } from './features/connection/sidebar'
export { DatabaseConnectionModal } from './features/connection/connection-modal'
