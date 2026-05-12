export type NodeType = 'concept' | 'fact' | 'question' | 'action' | 'link'
export type EdgeType = 'child' | 'association' | 'contradiction' | 'reference'
export type MapPurpose = 'brainstorm' | 'research' | 'planning' | 'learning' | 'other'
export type CreatedBy = 'human' | 'BrainstormAgent' | 'ResearchAgent' | 'StructureAgent' | 'SummaryAgent' | 'OnboardingAgent' | 'NodeConversationAgent'

export interface MindMapNode {
  id: string
  mindMapId: string
  parentId: string | null
  label: string
  content: string | null
  nodeType: NodeType
  positionX: number
  positionY: number
  depth: number
  color: string | null
  noteContent: string | null
  createdBy: CreatedBy
  isDeleted: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface MindMapEdge {
  id: string
  mindMapId: string
  sourceId: string
  targetId: string
  label: string | null
  edgeType: EdgeType
  createdBy: CreatedBy
  metadata: Record<string, unknown>
  createdAt: string
}

export interface MindMap {
  id: string
  userId: string
  title: string
  topic: string | null
  purpose: MapPurpose
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  nodes?: MindMapNode[]
  edges?: MindMapEdge[]
}
