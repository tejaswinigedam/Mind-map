"""
VisualizationAgent — Continuously converts reasoning into adaptive visual structures.
Provides directives for layout, color-coding, and emphasis.
"""
from ..graph.state import AgentState

def run_visualization_agent(state: AgentState) -> AgentState:
    directives = []
    
    # Identify the "hot" part of the map (where expansion is happening)
    selected_node_id = state.get("node_id")
    if selected_node_id:
        directives.append({
            "type": "highlight",
            "targetId": selected_node_id,
            "style": {"borderWidth": 3, "borderColor": "#7048e8"}
        })
    
    # Suggest a layout type based on cognitive state
    cog_state = state.get("cognitive_state", {}).get("state", "brainstorming")
    if cog_state == "deciding":
        directives.append({"type": "layout_suggestion", "layout": "comparison"})
    elif cog_state == "prioritizing":
        directives.append({"type": "layout_suggestion", "layout": "ranked_list"})
    else:
        directives.append({"type": "layout_suggestion", "layout": "radial"})
        
    return {**state, "visual_directives": directives}
