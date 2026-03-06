import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { WorkspaceContext } from '../lib/context.js'
import {
  readKanbanTasks,
  createKanbanTask,
  updateKanbanTask,
  deleteKanbanTask,
} from '../lib/kanban-store.js'
import type { KanbanStatus, KanbanTaskType } from '../../shared/types/index.js'

const TYPE_PREFIX: Record<KanbanTaskType, string> = {
  bug: 'B', feature: 'F', test: 'T', doc: 'D', ia: 'A', refactor: 'R',
}
function ticketLabel(n: number | undefined, type?: KanbanTaskType): string {
  return `${TYPE_PREFIX[type ?? 'feature']}-${n ?? 0}`
}

export function registerKanbanTools(server: McpServer, ctx: WorkspaceContext): void {
  // kanban_list
  server.tool(
    'kanban_list',
    'List kanban tickets with optional filters (status, priority)',
    {
      status: z.enum(['TODO', 'WORKING', 'PENDING', 'DONE', 'FAILED']).optional().describe('Filter by status'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Filter by priority'),
    },
    async ({ status, priority }) => {
      let tasks = readKanbanTasks(ctx.workspaceId)
      if (status) tasks = tasks.filter((t) => t.status === status)
      if (priority) tasks = tasks.filter((t) => t.priority === priority)

      const summary = tasks.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        type: t.type,
        targetProjectId: t.targetProjectId,
        isCtoTicket: t.isCtoTicket,
        parentTicketId: t.parentTicketId,
        childTicketIds: t.childTicketIds,
      }))

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(summary, null, 2),
        }],
      }
    },
  )

  // kanban_get
  server.tool(
    'kanban_get',
    'Get a kanban ticket by ID or ticket number',
    {
      id: z.string().optional().describe('Task UUID'),
      ticketNumber: z.number().optional().describe('Ticket number (e.g. 42)'),
    },
    async ({ id, ticketNumber }) => {
      const tasks = readKanbanTasks(ctx.workspaceId)
      const task = id
        ? tasks.find((t) => t.id === id)
        : tasks.find((t) => t.ticketNumber === ticketNumber)

      if (!task) {
        return {
          content: [{ type: 'text' as const, text: `Ticket not found` }],
          isError: true,
        }
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(task, null, 2) }],
      }
    },
  )

  // kanban_create — status forced to TODO
  server.tool(
    'kanban_create',
    'Create a new kanban ticket (status is always TODO). Use parentTicketId to link sub-tickets to a parent (e.g. CTO ticket).',
    {
      title: z.string().describe('Ticket title'),
      description: z.string().describe('Ticket description (markdown)'),
      priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Priority level'),
      type: z.enum(['bug', 'feature', 'test', 'doc', 'ia', 'refactor']).default('feature').describe('Ticket type'),
      targetProjectId: z.string().optional().describe('Target project UUID'),
      parentTicketId: z.string().optional().describe('Parent ticket UUID for linking (e.g. CTO ticket ID)'),
    },
    async ({ title, description, priority, type, targetProjectId, parentTicketId }) => {
      // Validate parentTicketId exists if provided
      if (parentTicketId) {
        const tasks = readKanbanTasks(ctx.workspaceId)
        const parent = tasks.find((t) => t.id === parentTicketId)
        if (!parent) {
          return {
            content: [{ type: 'text' as const, text: `Parent ticket ${parentTicketId} not found.` }],
            isError: true,
          }
        }
      }

      const task = createKanbanTask(ctx.workspaceId, {
        title,
        description,
        priority,
        type,
        status: 'TODO', // FORCED — AI tickets always start as TODO
        targetProjectId,
        parentTicketId,
      })

      const parentInfo = parentTicketId ? `\nLinked to parent ticket: ${parentTicketId}` : ''
      return {
        content: [{
          type: 'text' as const,
          text: `Created ticket ${ticketLabel(task.ticketNumber, task.type)}: ${task.title}${parentInfo}\n${JSON.stringify(task, null, 2)}`,
        }],
      }
    },
  )

  // kanban_update — PENDING is forbidden
  server.tool(
    'kanban_update',
    'Update a kanban ticket. PENDING status is not allowed.',
    {
      id: z.string().describe('Task UUID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.enum(['TODO', 'WORKING', 'DONE', 'FAILED']).optional().describe('New status (PENDING not allowed)'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('New priority'),
      type: z.enum(['bug', 'feature', 'test', 'doc', 'ia', 'refactor']).optional().describe('Ticket type'),
      result: z.string().optional().describe('Result/output text'),
      error: z.string().optional().describe('Error message'),
    },
    async ({ id, title, description, status, priority, type, result, error }) => {
      // Double-check: PENDING is excluded from the enum, but guard anyway
      if (status === ('PENDING' as KanbanStatus)) {
        return {
          content: [{ type: 'text' as const, text: 'PENDING status is not allowed via MCP.' }],
          isError: true,
        }
      }

      // CTO tickets cannot be set to DONE by Claude — create sub-tickets instead
      if (status === 'DONE') {
        const tasks = readKanbanTasks(ctx.workspaceId)
        const task = tasks.find((t) => t.id === id)
        if (task?.isCtoTicket) {
          return {
            content: [{
              type: 'text' as const,
              text: 'Un ticket CTO ne peut pas etre marque DONE. En tant que CTO, tu dois creer des sous-tickets (kanban_create avec parentTicketId) pour faire avancer le projet. Mets a jour la description du ticket CTO avec un resume de ton analyse et tes recommandations.',
            }],
            isError: true,
          }
        }
      }

      const updates: Record<string, unknown> = {}
      if (title !== undefined) updates.title = title
      if (description !== undefined) updates.description = description
      if (status !== undefined) updates.status = status
      if (priority !== undefined) updates.priority = priority
      if (type !== undefined) updates.type = type
      if (result !== undefined) updates.result = result
      if (error !== undefined) updates.error = error

      try {
        const task = updateKanbanTask(ctx.workspaceId, id, updates)
        return {
          content: [{
            type: 'text' as const,
            text: `Updated ticket ${ticketLabel(task.ticketNumber, task.type)}: ${task.title}\n${JSON.stringify(task, null, 2)}`,
          }],
        }
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: String(err) }],
          isError: true,
        }
      }
    },
  )

  // kanban_delete
  server.tool(
    'kanban_delete',
    'Delete a kanban ticket',
    {
      id: z.string().describe('Task UUID to delete'),
    },
    async ({ id }) => {
      try {
        deleteKanbanTask(ctx.workspaceId, id)
        return {
          content: [{ type: 'text' as const, text: `Deleted ticket ${id}` }],
        }
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: String(err) }],
          isError: true,
        }
      }
    },
  )
}
