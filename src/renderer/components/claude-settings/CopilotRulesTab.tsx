import { RulesManager } from './RulesManager'

interface Props {
  projectPath: string
}

export function CopilotRulesTab({ projectPath }: Props) {
  return <RulesManager projectPath={projectPath} />
}
