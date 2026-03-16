import { useMemo } from 'react'
import { useDatabaseStore } from './database-store'
import { useWorkspaceStore } from '../../lib/stores/workspaceStore'

export function useDatabase() {
  const store = useDatabaseStore()
  const { activeWorkspaceId } = useWorkspaceStore()

  const connections = useMemo(
    () => (activeWorkspaceId ? store.connectionsByWorkspace[activeWorkspaceId] ?? [] : []),
    [activeWorkspaceId, store.connectionsByWorkspace],
  )

  const activeConnection = useMemo(
    () => connections.find((c) => c.id === store.activeConnectionId) ?? null,
    [connections, store.activeConnectionId],
  )

  const activeStatus = store.activeConnectionId
    ? store.connectionStatuses[store.activeConnectionId] ?? 'disconnected'
    : 'disconnected'

  return {
    ...store,
    connections,
    activeConnection,
    activeStatus,
    activeWorkspaceId,
  }
}
