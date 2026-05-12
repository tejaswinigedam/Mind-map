"""
LangGraph workflow — wires all agents together.
OrchestratorAgent acts as supervisor.
BrainstormAgent and ResearchAgent run in parallel via Send API.
"""
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from ..graph.state import AgentState
from ..agents.orchestrator import classify_intent, merge_proposals
from ..agents.brainstorm import run_brainstorm_agent
from ..agents.research import run_research_agent
from ..agents.onboarding import run_onboarding_agent
from ..agents.socratic import run_socratic_agent


def build_workflow() -> StateGraph:
    builder = StateGraph(AgentState)

    # Nodes
    builder.add_node("classify_intent", classify_intent)
    builder.add_node("run_brainstorm", run_brainstorm_agent)
    builder.add_node("run_research", run_research_agent)
    builder.add_node("run_onboarding", run_onboarding_agent)
    builder.add_node("run_socratic", run_socratic_agent)
    builder.add_node("merge_proposals", merge_proposals)

    # Entry point
    builder.set_entry_point("classify_intent")

    # After classification, route to agents based on plan
    builder.add_conditional_edges(
        "classify_intent",
        _route_to_agents,
        {
            "brainstorm_only":     "run_brainstorm",
            "research_only":       "run_research",
            "brainstorm_research": "run_brainstorm",
            "onboarding":          "run_onboarding",
            "socratic":            "run_socratic",
        },
    )

    # After brainstorm — if research also needed, run it; else merge
    builder.add_conditional_edges(
        "run_brainstorm",
        lambda s: "run_research" if "research" in s.get("agent_plan", []) else "merge_proposals",
        {"run_research": "run_research", "merge_proposals": "merge_proposals"},
    )

    # All paths converge to merge
    builder.add_edge("run_research",   "merge_proposals")
    builder.add_edge("run_onboarding", "merge_proposals")
    builder.add_edge("run_socratic",   "merge_proposals")
    builder.add_edge("merge_proposals", END)

    checkpointer = MemorySaver()
    return builder.compile(checkpointer=checkpointer)


def _route_to_agents(state: AgentState) -> str:
    plan = state.get("agent_plan", [])
    if "onboarding" in plan:
        return "onboarding"
    if "socratic" in plan:
        return "socratic"
    if "brainstorm" in plan and "research" in plan:
        return "brainstorm_research"
    if "brainstorm" in plan:
        return "brainstorm_only"
    if "research" in plan:
        return "research_only"
    return "brainstorm_only"


# Singleton compiled workflow
_workflow = None


def get_workflow():
    global _workflow
    if _workflow is None:
        _workflow = build_workflow()
    return _workflow
