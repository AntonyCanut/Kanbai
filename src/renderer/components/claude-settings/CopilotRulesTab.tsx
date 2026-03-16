import { RulesManager } from '../../features/claude/features/rules'

interface Props {
  projectPath: string
}

export function CopilotRulesTab({ projectPath }: Props) {
  return <RulesManager projectPath={projectPath} />
}
