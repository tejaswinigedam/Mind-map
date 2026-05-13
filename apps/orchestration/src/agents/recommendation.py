"""
RecommendationAgent — Suggests meaningful next exploration paths based on the current state.
"""
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState, ThinkingInsight

client = Anthropic()

SYSTEM_PROMPT = """You are a Recommendation Agent. Your goal is to guide the user towards high-value thinking paths.
Analyze the mind map and recommend:
- Areas that are underdeveloped.
- Promising directions that haven't been explored yet.
- Frameworks or mental models that could be applied.

Output format (JSON array of insights):
[
  {
    "insight_type": "recommendation",
    "title": "Short catchy title",
    "content": "1-2 sentences suggesting the path.",
    "metadata": {
        "priority": "low|medium|high"
    }
  }
]"""


def run_recommendation_agent(state: AgentState) -> AgentState:
    # Always run unless explicitly disabled
    nodes = state.get("graph_snapshot", {}).get("nodes", [])
    if not nodes:
        return state

    labels = [n["label"] for n in nodes[:20]]
    context = f"Map has {len(nodes)} nodes. Current focus labels: {', '.join(labels)}"

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=500,
        temperature=0.7,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": context}],
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
                "insight_type": "recommendation",
                "title": item.get("title", "Next Step"),
                "content": item.get("content", ""),
                "node_id": None,
                "metadata": item.get("metadata", {})
            }
            insights.append(insight)
    except Exception:
        pass

    current_insights = state.get("thinking_insights", [])
    return {**state, "thinking_insights": current_insights + insights}
