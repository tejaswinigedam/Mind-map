"""
SystemsThinkingAgent — Identifies dependencies, feedback loops, stakeholders, and systemic impacts.
"""
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState, ThinkingInsight

client = Anthropic()

SYSTEM_PROMPT = """You are a Systems Thinking Agent. Your job is to analyze the "big picture" and hidden connections.
Analyze the mind map context and identify:
- Dependencies: What needs to happen before this node can be realized?
- Feedback Loops: Are there self-reinforcing or balancing loops?
- Stakeholders: Who is affected by this idea?
- Ripple Effects: What are the second and third-order consequences?

Output format (JSON array of insights):
[
  {
    "insight_type": "systems",
    "title": "Short catchy title",
    "content": "1-2 sentences explaining the systemic connection.",
    "metadata": {
        "category": "dependency|loop|stakeholder|ripple_effect",
        "impact": "low|medium|high"
    }
  }
]"""


def run_systems_thinking_agent(state: AgentState) -> AgentState:
    if "systems_thinking" not in state.get("agent_plan", []):
        return state

    text = state.get("text", "")
    nodes = state.get("graph_snapshot", {}).get("nodes", [])
    selected_node_id = state.get("node_id")
    
    context = ""
    if selected_node_id:
        selected_node = next((n for n in nodes if n["id"] == selected_node_id), None)
        if selected_node:
            context = f"Analyzing node: '{selected_node['label']}'"
    else:
        context = f"Overall map context with {len(nodes)} nodes."

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=800,
        temperature=0.6,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Context: {context}\nUser Input: {text}"}],
    )

    insights = []
    try:
        raw = response.content[0].text.strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0]
            
        data = json.loads(raw.strip())
        for item in data:
            insight: ThinkingInsight = {
                "insight_type": "systems",
                "title": item.get("title", "Systems Insight"),
                "content": item.get("content", ""),
                "node_id": selected_node_id,
                "metadata": item.get("metadata", {})
            }
            insights.append(insight)
    except Exception:
        pass

    current_insights = state.get("thinking_insights", [])
    return {**state, "thinking_insights": current_insights + insights}
