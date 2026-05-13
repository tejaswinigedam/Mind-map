"""
FocusAgent — Reduces cognitive overload by merging duplicate thoughts and keeping the session coherent.
"""
from ..graph.state import AgentState


def optimize_focus(state: AgentState) -> AgentState:
    """
    In a real implementation, this would use semantic similarity to find overlapping nodes.
    For now, it will perform a simple label-based deduplication across all proposal sources.
    """
    brainstorm_nodes = state.get("brainstorm_nodes", [])
    research_nodes = state.get("research_nodes", [])
    
    seen_labels = set()
    unique_brainstorm = []
    unique_research = []
    
    for node in brainstorm_nodes:
        label = node["label"].lower().strip()
        if label not in seen_labels:
            seen_labels.add(label)
            unique_brainstorm.append(node)
            
    for node in research_nodes:
        label = node["label"].lower().strip()
        if label not in seen_labels:
            seen_labels.add(label)
            unique_research.append(node)
            
    return {
        **state,
        "brainstorm_nodes": unique_brainstorm,
        "research_nodes": unique_research
    }
