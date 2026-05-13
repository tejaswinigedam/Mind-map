"""
DecisionIntelligenceAgent — Evaluates trade-offs, risks, and priorities for decision-making.
"""
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState, ThinkingInsight

client = Anthropic()

SYSTEM_PROMPT = """You are a Decision Intelligence Agent. Your goal is to help the user evaluate options.
Analyze the mind map context and identify:
- Trade-offs: What is gained and what is lost?
- Risks: What could go wrong?
- Priorities: Which options are most impactful or urgent?
- Outcomes: What does success look like for this path?

Output format (JSON array of insights):
[
  {
    "insight_type": "decision",
    "title": "Short catchy title",
    "content": "1-2 sentences evaluating the option.",
    "metadata": {
        "category": "tradeoff|risk|priority|outcome",
        "impact": "low|medium|high"
    }
  }
]"""


def run_decision_intelligence_agent(state: AgentState) -> AgentState:
    if "decision_intelligence" not in state.get("agent_plan", []):
        return state

    text = state.get("text", "")
    nodes = state.get("graph_snapshot", {}).get("nodes", [])
    selected_node_id = state.get("node_id")
    
    context = ""
    if selected_node_id:
        selected_node = next((n for n in nodes if n["id"] == selected_node_id), None)
        if selected_node:
            context = f"Evaluating decision point: '{selected_node['label']}'"

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=800,
        temperature=0.5,
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
                "insight_type": "decision",
                "title": item.get("title", "Decision Insight"),
                "content": item.get("content", ""),
                "node_id": selected_node_id,
                "metadata": item.get("metadata", {})
            }
            insights.append(insight)
    except Exception:
        pass

    current_insights = state.get("thinking_insights", [])
    return {**state, "thinking_insights": current_insights + insights}
