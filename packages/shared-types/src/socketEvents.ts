import type { AgentProposal, AgentThinkingEvent, SocraticQuestion } from './agent'
import type { MindMapNode, MindMapEdge } from './mindMap'

// Client → Server events
export interface ClientToServerEvents {
  'agent:request': (payload: AgentRequestPayload) => void
  'proposal:accept': (payload: { proposalId: string; editedPayload?: unknown }) => void
  'proposal:reject': (payload: { proposalId: string; reason?: string }) => void
  'proposal:retry': (payload: { proposalId: string }) => void
  'node:conversation': (payload: NodeConversationPayload) => void
  'socratic:answer': (payload: { questionId: string; answer: string }) => void
  'feedback:submit': (payload: FeedbackPayload) => void
  'map:subscribe': (payload: { mindMapId: string }) => void
}

// Server → Client events
export interface ServerToClientEvents {
  'agent:ack': (payload: { jobId: string }) => void
  'agent:thinking': (payload: AgentThinkingEvent) => void
  'agent:proposal': (payload: AgentProposal) => void
  'agent:error': (payload: { jobId: string; message: string; retryable: boolean }) => void
  'node:update': (payload: { nodes: MindMapNode[]; edges: MindMapEdge[] }) => void
  'socratic:question': (payload: SocraticQuestion) => void
  'conversation:reply': (payload: ConversationReply) => void
  'export:ready': (payload: { jobId: string; downloadUrl: string }) => void
  'rate_limit:warning': (payload: { remaining: number; resetAt: string }) => void
}

export interface AgentRequestPayload {
  sessionId: string
  nodeId?: string
  intent: 'expand' | 'research' | 'brainstorm' | 'structure' | 'summarize' | 'critique' | 'onboard' | 'dive_deeper' | 'challenge'
  text?: string
  graphSnapshot: { nodes: MindMapNode[]; edges: MindMapEdge[] }
}

export interface NodeConversationPayload {
  sessionId: string
  nodeId: string
  message: string
  conversationId?: string
}

export interface ConversationReply {
  conversationId: string
  nodeId: string
  content: string
  extractedProposals?: AgentProposal[]
}

export interface FeedbackPayload {
  proposalId?: string
  nodeId?: string
  agentName?: string
  eventType: 'thumbs_up' | 'thumbs_down' | 'report'
  freeText?: string
}
