"""
OnboardingAgent — Creates a rich starting map when user first arrives.
Never shows a blank canvas.
"""
import uuid
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState, ProposalNode

client = Anthropic()

SYSTEM_PROMPT = """You are an expert mind map architect helping someone START their exploration.
Your goal is to create an inspiring, non-generic opening structure that makes them want to dive deeper.

Rules:
- Create a ROOT node + 4-6 first-level child nodes that represent genuinely different angles/dimensions
- Each first-level node should spark curiosity, not just categorize
- Avoid obvious categories like "Benefits", "Challenges", "History" — go deeper
- Include at least one provocative or counterintuitive angle
- Suggest 2-3 Socratic starter questions that would deepen the exploration
- Output valid JSON only

Output format:
{
  "rootLabel": "The central topic (concise)",
  "rootContent": "1 sentence framing the exploration",
  "children": [
    {
      "label": "Evocative node label",
      "content": "Why this angle matters",
      "nodeType": "concept|question|fact",
      "color": null
    }
  ],
  "starterQuestions": [
    "A thought-provoking question to explore further",
    "Another angle the user might not have considered"
  ]
}"""


def run_onboarding_agent(state: AgentState) -> AgentState:
    if "onboarding" not in state.get("agent_plan", []):
        return state

    topic = state.get("text", "a new topic")
    intent = state.get("intent", "brainstorm")
    prefs = state.get("user_preferences", {})

    user_message = (
        f"The user wants to explore: '{topic}'\n"
        f"Their purpose: {intent}\n"
        f"Depth preference: {prefs.get('preferred_depth', 3)}/5\n\n"
        "Create an inspiring opening mind map structure that avoids generic categories. "
        "Make each first-level node feel like it opens a door to a new world of ideas."
    )

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=1500,
        temperature=0.7,
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
    except (json.JSONDecodeError, IndexError):
        return {**state, "onboarding_nodes": [], "socratic_question": None}

    root_id = str(uuid.uuid4())
    nodes: list[ProposalNode] = [
        {
            "tempId": root_id,
            "label": data.get("rootLabel", topic),
            "content": data.get("rootContent"),
            "nodeType": "concept",
            "parentId": None,
            "confidence": 0.9,
            "sources": [],
            "metadata": {"isRoot": True, "agentVersion": "onboarding-v1.0"},
        }
    ]

    for i, child in enumerate(data.get("children", [])):
        node: ProposalNode = {
            "tempId": str(uuid.uuid4()),
            "label": child.get("label", f"Node {i+1}"),
            "content": child.get("content"),
            "nodeType": child.get("nodeType", "concept"),
            "parentId": root_id,
            "confidence": 0.85,
            "sources": [],
            "metadata": {"agentVersion": "onboarding-v1.0"},
        }
        nodes.append(node)

    # Use first starter question as initial Socratic question
    starter_questions = data.get("starterQuestions", [])
    first_question = starter_questions[0] if starter_questions else None

    return {
        **state,
        "onboarding_nodes": nodes,
        "socratic_question": first_question,
    }
