"""
SynthesisAgent — Compresses complex branches into summaries or actionable insights.
"""
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState, ThinkingInsight

client = Anthropic()

SYSTEM_PROMPT = """You are a Synthesis Agent. Your goal is to reduce complexity and find patterns.
Analyze the mind map context and provide:
- A high-level summary of the current branch.
- Key themes or patterns you've identified.
- Actionable takeaways.

Output format (JSON):
{
  "summary": "1-2 sentence high-level summary",
  "themes": ["theme 1", "theme 2"],
  "takeaways": ["action 1", "action 2"]
}"""


def run_synthesis_agent(state: AgentState) -> AgentState:
    if "synthesis" not in state.get("agent_plan", []):
        return state

    nodes = state.get("graph_snapshot", {}).get("nodes", [])
    if not nodes:
        return state

    # Sample labels to represent the map
    labels = [n["label"] for n in nodes[:20]]
    context = f"Synthesizing map with {len(nodes)} nodes. Sample labels: {', '.join(labels)}"

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=800,
        temperature=0.3,
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
        
        summary_text = data.get("summary", "")
        if data.get("themes"):
            summary_text += "\n\nKey Themes: " + ", ".join(data["themes"])
        if data.get("takeaways"):
            summary_text += "\n\nNext Actions:\n- " + "\n- ".join(data["takeaways"])
            
    except Exception:
        summary_text = "Synthesis failed."

    return {**state, "summary_text": summary_text}
