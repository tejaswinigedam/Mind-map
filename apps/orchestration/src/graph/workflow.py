from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from ..graph.state import AgentState
from ..agents.registry import AgentRegistry

def build_workflow() -> StateGraph:
    builder = StateGraph(AgentState)

    # Register all nodes from registry
    # Pre-processing & Core
    builder.add_node("identify_cognitive_state", AgentRegistry.get_agent("cognitive_state"))
    builder.add_node("retrieve_memory", AgentRegistry.get_agent("memory"))
    builder.add_node("run_learning", AgentRegistry.get_agent("learning"))
    builder.add_node("classify_intent", AgentRegistry.get_agent("orchestrator_classify"))
    builder.add_node("run_visualization", AgentRegistry.get_agent("visualization"))
    
    # Specialists
    for spec in AgentRegistry.get_all_specialists():
        builder.add_node(f"run_{spec}", AgentRegistry.get_agent(spec))
    
    # Optimization & Post-processing
    builder.add_node("optimize_focus", AgentRegistry.get_agent("focus"))
    builder.add_node("run_recommendation", AgentRegistry.get_agent("recommendation"))
    builder.add_node("merge_proposals", AgentRegistry.get_agent("orchestrator_merge"))

    # Entry point
    builder.set_entry_point("identify_cognitive_state")

    # Sequential preprocessing
    builder.add_edge("identify_cognitive_state", "retrieve_memory")
    builder.add_edge("retrieve_memory", "run_learning")
    builder.add_edge("run_learning", "classify_intent")
    builder.add_edge("classify_intent", "run_visualization")

    # Dynamic routing to specialist agents
    specialists = [f"run_{s}" for s in AgentRegistry.get_all_specialists()]

    def route_to_specialists(state: AgentState):
        plan = state.get("agent_plan", [])
        to_run = [f"run_{a}" for a in plan if f"run_{a}" in specialists]
        return to_run if to_run else ["run_brainstorm"]

    builder.add_conditional_edges(
        "run_visualization",
        route_to_specialists,
        {name: name for name in specialists}
    )

    # All specialists fan back into optimization
    for name in specialists:
        builder.add_edge(name, "optimize_focus")

    builder.add_edge("optimize_focus", "run_recommendation")
    builder.add_edge("run_recommendation", "merge_proposals")
    builder.add_edge("merge_proposals", END)

    checkpointer = MemorySaver()
    return builder.compile(checkpointer=checkpointer)


# Singleton compiled workflow
_workflow = None

def get_workflow():
    global _workflow
    if _workflow is None:
        _workflow = build_workflow()
    return _workflow
