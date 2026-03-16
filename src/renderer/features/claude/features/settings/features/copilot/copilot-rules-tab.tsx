<<<<<<<< HEAD:src/renderer/features/claude/features/settings/features/copilot/copilot-rules-tab.tsx
import { RulesManager } from '../../components/rules-manager'
========
import { RulesManager } from '../../../../../../components/claude-settings/RulesManager'
>>>>>>>> kanban/r-44:src/renderer/features/claude/features/ai-providers/features/copilot/copilot-rules-tab.tsx

interface Props {
  projectPath: string
}

export function CopilotRulesTab({ projectPath }: Props) {
  return <RulesManager projectPath={projectPath} />
}
