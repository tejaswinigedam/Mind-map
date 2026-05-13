"""
CriticalThinkingAgent — Surfaces assumptions, blind spots, and logical inconsistencies.
"""
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState, ThinkingInsight

client = Anthropic()

SYSTEM_PROMPT = """You are a Critical Thinking Agent. Your job is to challenge the user's thinking in a constructive way.
Analyze the current branch of the mind map and look for:
- Hidden assumptions that might not be true.
- Blind spots or missing perspectives.
- Logical contradictions or weak reasoning.
- Cognitive biases (e.g., confirmation bias, status quo bias).

Output format (JSON array of insights):
[
  {
    "insight_type": "critical",
    "title": "Short catchy title",
    "content": "1-2 sentences explaining the insight or asking a challenging question.",
    "metadata": {
        "category": "assumption|blind_spot|contradiction|bias",
        "severity": "low|medium|high"
    }
  }
]"""


def run_critical_thinking_agent(state: AgentState) -> AgentState:
    if "critical_thinking" not in state.get("agent_plan", []):
        return state

    text = state.get("text", "")
    nodes = state.get("graph_snapshot", {}).get("nodes", [])
    selected_node_id = state.get("node_id")
    
    # Focus analysis on the selected node and its neighbors
    context = ""
    if selected_node_id:
        selected_node = next((n for n in nodes if n["id"] == selected_node_id), None)
        if selected_node:
            context = f"Analyzing node: '{selected_node['label']}'\nContent: {selected_node.get('content', 'N/A')}"
    else:
        context = f"Analyzing overall map. Nodes: {[n['label'] for n in nodes[:10]]}"

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=800,
        temperature=0.7,
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
                "insight_type": "critical",
                "title": item.get("title", "Critical Insight"),
                "content": item.get("content", ""),
                "node_id": selected_node_id,
                "metadata": item.get("metadata", {})
            }
            insights.append(insight)
    except Exception:
        pass

    current_insights = state.get("thinking_insights", [])
    return {**state, "thinking_insights": current_insights + insights}
