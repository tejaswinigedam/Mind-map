"""
AlternativesAgent — Proposes counter-perspectives and new directions.
"""
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState, ThinkingInsight

client = Anthropic()

SYSTEM_PROMPT = """You are an Alternatives Agent. Your job is to prevent premature convergence by proposing new directions.
Analyze the current thinking and suggest:
- "What if" scenarios: Radical departures from the current path.
- Counter-perspectives: How would a critic or a different persona see this?
- Lateral shifts: Unrelated concepts that might trigger new ideas.
- Alternative framings: Rephrase the problem or goal in a new way.

Output format (JSON array of insights):
[
  {
    "insight_type": "alternative",
    "title": "Short catchy title",
    "content": "1-2 sentences proposing the alternative.",
    "metadata": {
        "strategy": "what_if|counter|lateral|reframing"
    }
  }
]"""


def run_alternatives_agent(state: AgentState) -> AgentState:
    if "alternatives" not in state.get("agent_plan", []):
        return state

    text = state.get("text", "")
    nodes = state.get("graph_snapshot", {}).get("nodes", [])
    selected_node_id = state.get("node_id")
    
    context = ""
    if selected_node_id:
        selected_node = next((n for n in nodes if n["id"] == selected_node_id), None)
        if selected_node:
            context = f"Analyzing node: '{selected_node['label']}'"

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=800,
        temperature=0.9, # High temperature for creativity
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
                "insight_type": "alternative",
                "title": item.get("title", "Alternative Perspective"),
                "content": item.get("content", ""),
                "node_id": selected_node_id,
                "metadata": item.get("metadata", {})
            }
            insights.append(insight)
    except Exception:
        pass

    current_insights = state.get("thinking_insights", [])
    return {**state, "thinking_insights": current_insights + insights}
