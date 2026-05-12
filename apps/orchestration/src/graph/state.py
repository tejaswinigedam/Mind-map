from typing import TypedDict, Optional, List, Any
from langgraph.graph import add_messages
from typing import Annotated


class GraphNode(TypedDict):
    id: str
    label: str
    content: Optional[str]
    nodeType: str
    parentId: Optional[str]
    depth: int
    createdBy: str
    metadata: dict


class GraphEdge(TypedDict):
    id: str
    sourceId: str
    targetId: str
    label: Optional[str]
    edgeType: str


class GraphSnapshot(TypedDict):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class ProposalNode(TypedDict):
    tempId: str
    label: str
    content: Optional[str]
    nodeType: str
    parentId: Optional[str]
    confidence: float
    sources: List[dict]
    metadata: dict


class AgentState(TypedDict):
    # Input
    user_id: str
    session_id: str
    mind_map_id: str
    socket_id: str
    intent: str
    text: Optional[str]
    node_id: Optional[str]
    graph_snapshot: GraphSnapshot

    # Orchestrator decision
    agent_plan: List[str]  # which agents to invoke

    # Agent outputs (accumulated)
    brainstorm_nodes: List[ProposalNode]
    research_nodes: List[ProposalNode]
    structure_proposal: Optional[dict]
    summary_text: Optional[str]
    critique_report: Optional[dict]
    onboarding_nodes: List[ProposalNode]

    # Merged output
    final_proposals: List[dict]
    socratic_question: Optional[str]

    # User preferences (injected by PersonalizationAgent)
    user_preferences: dict

    # Error state
    error: Optional[str]
