"""
SocraticAgent — Generates a single, focused challenge question.
Asks "why", "what if", "who benefits", "what's missing".
Never lectures — always questions.
"""
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState

client = Anthropic()

SYSTEM_PROMPT = """You are a Socratic philosopher and critical thinking coach.
Your ONLY job is to ask ONE powerful question that challenges assumptions or opens new territory.

Rules:
- Ask exactly ONE question — no more
- The question must be specific to the actual nodes in the map (reference real node labels)
- Challenge the FRAME, not just add content: "Why do we assume X?", "What would happen if the opposite were true?", "Who is missing from this map?", "What second-order effect haven't we explored?"
- Never ask generic questions like "What else could you add?"
- The question should be provocative enough to generate 3-5 new nodes if answered
- Output valid JSON only

Output format:
{
  "question": "Your single, specific, provocative question",
  "targetNodeLabel": "The specific node this challenges (or null for the whole map)",
  "angle": "assumption_challenge|second_order|missing_perspective|causal_reversal|scale_shift"
}"""


def run_socratic_agent(state: AgentState) -> AgentState:
    if "socratic" not in state.get("agent_plan", []):
        return state

    graph = state.get("graph_snapshot", {})
    nodes = graph.get("nodes", [])

    if len(nodes) < 2:
        return state

    # Build map summary for the agent
    node_labels = [n["label"] for n in nodes[:15]]
    map_summary = f"Current map has {len(nodes)} nodes: {', '.join(node_labels)}"
    topic = state.get("text") or (nodes[0]["label"] if nodes else "this topic")

    user_message = (
        f"Mind map topic: '{topic}'\n"
        f"{map_summary}\n\n"
        "Generate ONE challenging Socratic question that will push the explorer "
        "beyond the current thinking in this map."
    )

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=300,
        temperature=0.8,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    try:
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw.strip())
        question = data.get("question", "")
    except (json.JSONDecodeError, IndexError):
        return state

    if question:
        return {**state, "socratic_question": question}
    return state


def run_socratic_answer(state: AgentState) -> AgentState:
    """
    When user answers a Socratic question, generate new nodes from their answer.
    Delegates to BrainstormAgent with the answer as context.
    """
    answer = state.get("text", "")
    question = state.get("metadata", {}).get("question", "")

    # Inject question+answer as brainstorm context
    enriched_text = f"Question: {question}\nAnswer: {answer}\n\nExpand the answer into new mind map nodes."
    return {**state, "text": enriched_text, "agent_plan": ["brainstorm"]}
