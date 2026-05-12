"""
BrainstormAgent — Generates creative, lateral node suggestions.
Always returns candidates for user approval; never auto-applies.
"""
import uuid
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState, ProposalNode

client = Anthropic()

SYSTEM_PROMPT = """You are a creative brainstorming assistant helping to expand a mind map.
Your role is to generate diverse, insightful, and non-obvious node suggestions.

Guidelines:
- Go BEYOND the obvious. Avoid generic, surface-level ideas.
- Include lateral connections, second-order effects, contrarian perspectives, and interdisciplinary angles.
- Each node should be a distinct concept worth exploring independently.
- Vary the types: some factual, some questions, some provocative claims, some frameworks.
- Output in valid JSON only — no commentary outside the JSON.
- NEVER claim certainty. Flag speculative ideas clearly.
- Aim for 4-7 diverse nodes unless the user requests more or fewer.

Output format (JSON array):
[
  {
    "label": "Short node label (2-6 words)",
    "content": "1-2 sentence elaboration (optional, null if obvious)",
    "nodeType": "concept|fact|question|action",
    "confidence": 0.0-1.0,
    "isSpeculative": true|false,
    "angle": "what perspective this represents"
  }
]"""


def run_brainstorm_agent(state: AgentState) -> AgentState:
    if "brainstorm" not in state.get("agent_plan", []):
        return state

    graph = state.get("graph_snapshot", {})
    selected_node = _find_node(graph.get("nodes", []), state.get("node_id"))
    topic = state.get("text") or (selected_node["label"] if selected_node else "the main topic")
    map_context = _summarize_map(graph)
    prefs = state.get("user_preferences", {})

    user_message = f"""Mind map topic context: {map_context}

Target node to expand: "{topic}"

User's purpose: {state.get('intent', 'brainstorm')}
Preferred depth: {prefs.get('preferred_depth', 3)}/5
Preferred breadth: {prefs.get('preferred_breadth', 3)}/5

Generate {_target_count(prefs)} creative, non-obvious node suggestions to expand this concept.
Focus on: {prefs.get('domain_glossary', {}).get('focus', 'diverse perspectives')}"""

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=1500,
        temperature=0.85,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    try:
        raw = response.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        suggestions = json.loads(raw.strip())
    except (json.JSONDecodeError, IndexError):
        return {**state, "brainstorm_nodes": [], "error": "BrainstormAgent: failed to parse output"}

    nodes: list[ProposalNode] = []
    parent_id = state.get("node_id")

    for s in suggestions:
        node: ProposalNode = {
            "tempId": str(uuid.uuid4()),
            "label": s.get("label", "Untitled"),
            "content": s.get("content"),
            "nodeType": s.get("nodeType", "concept"),
            "parentId": parent_id,
            "confidence": float(s.get("confidence", 0.6)),
            "sources": [],
            "metadata": {
                "isSpeculative": s.get("isSpeculative", False),
                "angle": s.get("angle", ""),
                "agentVersion": "brainstorm-v1.0",
            },
        }
        nodes.append(node)

    return {**state, "brainstorm_nodes": nodes}


def _find_node(nodes: list, node_id: str | None) -> dict | None:
    if not node_id:
        return None
    return next((n for n in nodes if n["id"] == node_id), None)


def _summarize_map(graph: dict) -> str:
    nodes = graph.get("nodes", [])
    if not nodes:
        return "Empty map (just starting)"
    labels = [n["label"] for n in nodes[:10]]
    more = f" (+{len(nodes) - 10} more)" if len(nodes) > 10 else ""
    return f"{len(nodes)} nodes including: {', '.join(labels)}{more}"


def _target_count(prefs: dict) -> int:
    breadth = prefs.get("preferred_breadth", 3)
    return max(3, min(8, breadth + 2))
