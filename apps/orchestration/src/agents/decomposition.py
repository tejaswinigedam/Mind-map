"""
DecompositionAgent — Breaks complex ideas into structured sub-branches or frameworks.
Unlike BrainstormAgent, this focuses on logical structural breakdown.
"""
import json
import uuid
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState, ProposalNode

client = Anthropic()

SYSTEM_PROMPT = """You are a Decomposition Agent. Your goal is to take a complex topic and break it down into its constituent parts.
Think in terms of hierarchies, frameworks (e.g., SWOT, PESTLE, MECE), and structural components.

Guidelines:
- Aim for mutually exclusive and collectively exhaustive (MECE) branches when possible.
- Each sub-node should be a logical component of the parent.
- Provide 6-10 sub-nodes that offer a comprehensive and deep structural breakdown.

Output format (JSON array):
[
  {
    "label": "Component name",
    "content": "Why this component is part of the breakdown.",
    "nodeType": "concept",
    "confidence": 0.9
  }
]"""


def run_decomposition_agent(state: AgentState) -> AgentState:
    if "decomposition" not in state.get("agent_plan", []):
        return state

    graph = state.get("graph_snapshot", {})
    selected_node_id = state.get("node_id")
    selected_node = next((n for n in graph.get("nodes", []) if n["id"] == selected_node_id), None)
    
    if not selected_node:
        return state

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=1000,
        temperature=0.4,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Decompose this concept: '{selected_node['label']}'\nExisting context: {selected_node.get('content', '')}"}],
    )

    new_nodes = []
    try:
        raw = response.content[0].text.strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0]
            
        data = json.loads(raw.strip())
        for item in data:
            node: ProposalNode = {
                "tempId": str(uuid.uuid4()),
                "label": item.get("label", "Untitled"),
                "content": item.get("content"),
                "nodeType": item.get("nodeType", "concept"),
                "parentId": selected_node_id,
                "confidence": float(item.get("confidence", 0.8)),
                "sources": [],
                "metadata": {"agent": "DecompositionAgent"}
            }
            new_nodes.append(node)
    except Exception:
        pass

    current_decomposition = state.get("decomposition_nodes", [])
    return {**state, "decomposition_nodes": current_decomposition + new_nodes}
