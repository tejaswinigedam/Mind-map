"""
CognitiveStateAgent — Identifies the user's current cognitive state to drive orchestration.
States: brainstorming, stuck, prioritizing, reflecting, deciding, learning, research.
"""
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState, CognitiveState

client = Anthropic()

SYSTEM_PROMPT = """You are a cognitive analysis agent for a collaborative thinking mind-map.
Your goal is to identify the user's current "thinking mode" based on their latest input and the state of their mind map.

Thinking Modes:
- brainstorming: Generating new ideas, broad exploration.
- stuck: Expressing frustration, circular thinking, or asking "what now?".
- prioritizing: Trying to rank, filter, or narrow down ideas.
- reflecting: Summarizing progress, looking for patterns, or checking alignment with goals.
- deciding: Comparing options, evaluating trade-offs, or making a final choice.
- learning: Seeking explanations, background info, or "how it works".
- research: Asking for facts, evidence, or external data.

Output format (JSON):
{
  "state": "one of the modes above",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why this mode was chosen"
}"""


def identify_cognitive_state(state: AgentState) -> AgentState:
    text = state.get("text", "")
    intent = state.get("intent", "brainstorm")
    nodes = state.get("graph_snapshot", {}).get("nodes", [])
    
    user_message = f"User Input: {text}\nDeclared Intent: {intent}\nCurrent Node Count: {len(nodes)}"
    
    # In a real scenario, we'd use the LLM to classify. 
    # For now, let's use a mix of heuristic and LLM placeholder logic.
    
    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=300,
        temperature=0,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    
    try:
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        
        cog_state: CognitiveState = {
            "state": result.get("state", "brainstorming"),
            "confidence": float(result.get("confidence", 0.7)),
            "reasoning": result.get("reasoning", "Analysis complete.")
        }
    except Exception:
        cog_state: CognitiveState = {
            "state": "brainstorming",
            "confidence": 0.5,
            "reasoning": "Fallback due to parsing error."
        }
        
    return {**state, "cognitive_state": cog_state}
