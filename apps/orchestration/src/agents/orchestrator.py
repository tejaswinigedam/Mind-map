"""
OrchestratorAgent — Supervisor that classifies intent and routes to specialist agents.
"""
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState

client = Anthropic()

INTENT_TO_AGENTS = {
    "brainstorm":   ["brainstorm"],
    "research":     ["research"],
    "expand":       ["brainstorm", "research"],
    "dive_deeper":  ["brainstorm", "research"],
    "onboard":      ["onboarding"],
    "structure":    ["structure"],
    "summarize":    ["summary"],
    "critique":     ["critique"],
    "challenge":    ["socratic"],
}


def classify_intent(state: AgentState) -> AgentState:
    """Determine which agents to invoke based on user intent."""
    intent = state.get("intent", "brainstorm")
    agents = INTENT_TO_AGENTS.get(intent, ["brainstorm"])
    return {**state, "agent_plan": agents, "error": None}


def merge_proposals(state: AgentState) -> AgentState:
    """
    Merge outputs from all agents, deduplicate similar nodes,
    and build the final proposal list.
    """
    all_nodes: list = []
    all_nodes.extend(state.get("brainstorm_nodes", []))
    all_nodes.extend(state.get("research_nodes", []))
    all_nodes.extend(state.get("onboarding_nodes", []))

    # Simple label-based dedup (full implementation uses pgvector cosine similarity)
    seen_labels: set = set()
    deduped = []
    for node in all_nodes:
        key = node["label"].lower().strip()
        if key not in seen_labels:
            seen_labels.add(key)
            deduped.append(node)

    proposals = []

    if deduped:
        proposals.append({
            "proposalType": "nodes",
            "agentName": _infer_agent_name(deduped),
            "payload": {"nodes": deduped},
            "confidenceLevel": _compute_confidence(deduped),
            "reasoning": _build_reasoning(state),
            "sources": _collect_sources(deduped),
        })

    if state.get("structure_proposal"):
        proposals.append({
            "proposalType": "restructure",
            "agentName": "StructureAgent",
            "payload": state["structure_proposal"],
            "confidenceLevel": "medium",
            "reasoning": "Structural reorganization based on thematic analysis.",
            "sources": [],
        })

    if state.get("summary_text"):
        proposals.append({
            "proposalType": "summary",
            "agentName": "SummaryAgent",
            "payload": {"text": state["summary_text"]},
            "confidenceLevel": "high",
            "reasoning": "Summary of the selected branch.",
            "sources": [],
        })

    if state.get("critique_report"):
        proposals.append({
            "proposalType": "critique",
            "agentName": "CritiqueAgent",
            "payload": state["critique_report"],
            "confidenceLevel": "medium",
            "reasoning": "Critique based on logical consistency analysis.",
            "sources": [],
        })

    return {**state, "final_proposals": proposals}


def _infer_agent_name(nodes: list) -> str:
    has_sources = any(len(n.get("sources", [])) > 0 for n in nodes)
    return "ResearchAgent" if has_sources else "BrainstormAgent"


def _compute_confidence(nodes: list) -> str:
    avg = sum(n.get("confidence", 0.5) for n in nodes) / max(len(nodes), 1)
    if avg >= 0.75: return "high"
    if avg >= 0.45: return "medium"
    return "low"


def _build_reasoning(state: AgentState) -> str:
    intent = state.get("intent", "brainstorm")
    node_count = len(state.get("brainstorm_nodes", [])) + len(state.get("research_nodes", []))
    topic = state.get("text") or "this topic"
    return (
        f"Based on your {intent} request about '{topic}', "
        f"I generated {node_count} candidate ideas. "
        "Each suggestion is a starting point — accept what resonates, edit what's close, and reject what doesn't fit."
    )


def _collect_sources(nodes: list) -> list:
    sources = []
    seen = set()
    for node in nodes:
        for src in node.get("sources", []):
            url = src.get("url", "")
            if url and url not in seen:
                seen.add(url)
                sources.append(src)
    return sources[:5]  # max 5 sources per proposal
