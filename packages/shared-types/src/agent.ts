export type AgentName =
  | 'OrchestratorAgent'
  | 'OnboardingAgent'
  | 'BrainstormAgent'
  | 'ResearchAgent'
  | 'StructureAgent'
  | 'SummaryAgent'
  | 'CritiqueAgent'
  | 'SocraticAgent'
  | 'NodeConversationAgent'
  | 'PersonalizationAgent'

export type ProposalType = 'nodes' | 'restructure' | 'summary' | 'critique' | 'onboarding' | 'socratic_question'
export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'edited' | 'expired'
export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface SourceCitation {
  url: string
  title: string
  domain: string
  publishedDate: string | null
  excerpt: string
}

export interface AgentProposal {
  id: string
  sessionId: string
  mindMapId: string
  agentName: AgentName
  promptVersion: string
  proposalType: ProposalType
  payload: ProposalPayload
  status: ProposalStatus
  userEdit: Record<string, unknown> | null
  confidenceScore: number | null
  confidenceLevel: ConfidenceLevel
  reasoning: string | null
  sources: SourceCitation[]
  createdAt: string
  resolvedAt: string | null
}

export interface ProposalPayload {
  nodes?: Array<{
    tempId: string
    label: string
    content: string | null
    nodeType: string
    parentId: string | null
    color?: string
    metadata?: Record<string, unknown>
    sources?: SourceCitation[]
  }>
  edges?: Array<{
    sourceId: string
    targetId: string
    label?: string
    edgeType: string
  }>
  restructure?: {
    moves: Array<{ nodeId: string; newParentId: string }>
    newEdges: Array<{ sourceId: string; targetId: string; label?: string }>
    summary: string
  }
  question?: string
  answer_context?: string
}

export interface AgentThinkingEvent {
  agent: AgentName
  message: string
  elapsedMs: number
}

export interface SocraticQuestion {
  id: string
  mindMapId: string
  question: string
  triggerNodeCount: number
  answered: boolean
  answerText: string | null
  generatedNodeIds: string[]
}
