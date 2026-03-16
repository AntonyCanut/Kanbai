import { RulesManager } from '../../features/claude/features/rules'

interface Props {
  projectPath: string
}

export function CodexRulesTab({ projectPath }: Props) {
  return <RulesManager projectPath={projectPath} />
}
