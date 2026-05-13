"""
ReflectionAgent — Periodically summarizes progress, unresolved questions, and emerging patterns.
"""
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState, ThinkingInsight

client = Anthropic()

SYSTEM_PROMPT = """You are a Reflection Agent. Your goal is to help the user step back and see the progress.
Summarize:
- What has been accomplished so far.
- What questions remain unanswered.
- Any meta-patterns or themes that are emerging.

Output format (JSON):
{
  "progress_summary": "1-2 sentences on what's been covered.",
  "unresolved_questions": ["question 1", "question 2"],
  "emerging_patterns": ["pattern 1"]
}"""


def run_reflection_agent(state: AgentState) -> AgentState:
    # Triggered periodically or on request
    if state.get("intent") != "reflect":
        # Check if map is large enough for a periodic reflection
        if len(state.get("graph_snapshot", {}).get("nodes", [])) % 10 != 0:
            # return state # Disabled for now, let's just run it if intent is reflect
            if state.get("intent") != "reflect":
                 return state

    nodes = state.get("graph_snapshot", {}).get("nodes", [])
    if not nodes:
        return state

    labels = [n["label"] for n in nodes[:20]]
    context = f"Reflecting on session with {len(nodes)} nodes. Current state: {', '.join(labels)}"

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=800,
        temperature=0.4,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": context}],
    )

    try:
        raw = response.content[0].text.strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0]
            
        data = json.loads(raw.strip())
        
        content = f"Progress: {data.get('progress_summary')}\n\nUnresolved:\n- " + "\n- ".join(data.get("unresolved_questions", []))
        
        insight: ThinkingInsight = {
            "insight_type": "reflection",
            "title": "Session Reflection",
            "content": content,
            "node_id": None,
            "metadata": {"patterns": data.get("emerging_patterns", [])}
        }
        
        current_insights = state.get("thinking_insights", [])
        return {**state, "thinking_insights": current_insights + [insight]}
    except Exception:
        return state
