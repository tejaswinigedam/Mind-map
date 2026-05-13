"""
ContextMemoryAgent — Manages long-term session memory and reasoning history.
Currently a mock implementation.
"""
from ..graph.state import AgentState


def retrieve_memory_context(state: AgentState) -> AgentState:
    # In a real implementation, this would query a vector store (like pgvector)
    # for relevant past nodes or conversation snippets.
    
    # Mock behavior: return a simple reminder of the session's starting goal
    memory = []
    
    # If the map is large, we might add a summary of the root topic
    nodes = state.get("graph_snapshot", {}).get("nodes", [])
    if nodes:
        root_node = next((n for n in nodes if n.get("depth") == 0), nodes[0])
        memory.append(f"The core goal of this session is exploring: {root_node['label']}")
        
    return {**state, "memory_context": memory}
