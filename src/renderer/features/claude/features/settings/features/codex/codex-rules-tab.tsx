<<<<<<<< HEAD:src/renderer/features/claude/features/settings/features/codex/codex-rules-tab.tsx
import { RulesManager } from '../../components/rules-manager'
========
import { RulesManager } from '../../../../../../components/claude-settings/RulesManager'
>>>>>>>> kanban/r-44:src/renderer/features/claude/features/ai-providers/features/codex/codex-rules-tab.tsx

interface Props {
  projectPath: string
}

export function CodexRulesTab({ projectPath }: Props) {
  return <RulesManager projectPath={projectPath} />
}
