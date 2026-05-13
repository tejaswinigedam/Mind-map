"""
LearningAgent — Adapts future interactions based on user behavior, edits, and thinking patterns.
Maintains a "user_profile" in the state to personalize responses.
"""
from ..graph.state import AgentState

def run_learning_agent(state: AgentState) -> AgentState:
    # In a full implementation, this would analyze the delta between 
    # AI proposals and user edits to learn preferences.
    
    # Mock behavior: identify if the user prefers short/long content
    # or specific node types based on their current graph.
    
    nodes = state.get("graph_snapshot", {}).get("nodes", [])
    user_nodes = [n for n in nodes if n.get("createdBy") == "human"]
    
    # Simple heuristic for learning preferences
    pref_depth = state.get("user_preferences", {}).get("preferred_depth", 3)
    if len(user_nodes) > 5:
        # If user adds many nodes, they might prefer breadth
        state["user_preferences"]["preferred_breadth"] = 5
    
    # Log the learning event (conceptual)
    print(f"[LearningAgent] Updated user profile based on {len(user_nodes)} human nodes.")
    
    return state
