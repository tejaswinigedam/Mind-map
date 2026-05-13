"""
NodeConversationAgent - Powers per-node chat panel.
Maintains conversation scoped to a single node + its position in the map.
"""
import uuid
from anthropic import Anthropic
from ..config import SONNET_MODEL
from ..graph.state import AgentState

client = Anthropic()

SYSTEM_PROMPT = """You are an expert research assistant embedded in a specific node of a mind map.
You have full awareness of:
1. The node you are attached to (its label, content, notes)
2. Its parent and sibling nodes in the map
3. The overall map topic and purpose

Your behaviors:
- Answer deep questions about this node's concept with nuance and specificity
- When the request is broad, vague, or underspecified, ask one concise clarifying question before answering
- Occasionally challenge the user's framing ("You're treating X as a cause - could it be a consequence?")
- Keep responses concise (3-5 sentences) unless the user asks for depth
- Be intellectually honest: distinguish what you know confidently from what is uncertain
- Prefer natural language over special tags or markers
- End with a question only when it genuinely helps move the discussion forward

When you identify a promising side idea, mention it naturally in the response rather than using special tags."""


def run_node_conversation(data: dict) -> dict:
    """
    data: {
        node_id, node_label, node_content, node_note,
        parent_label, sibling_labels, map_topic,
        messages: [{role, content}],
        new_message: str
    }
    Returns: {content, conversationId, extractedProposals}
    """
    node_label = data.get("node_label", "this node")
    parent_label = data.get("parent_label")
    sibling_labels = data.get("sibling_labels", [])
    map_topic = data.get("map_topic", "")
    messages = data.get("messages", [])
    new_message = data.get("new_message", "")
    conversation_id = data.get("conversation_id", str(uuid.uuid4()))

    context_parts = [f"You are attached to the node: '{node_label}'"]
    if data.get("node_content"):
        context_parts.append(f"Node content: {data['node_content']}")
    if data.get("node_note"):
        context_parts.append(f"User's notes on this node: {data['node_note']}")
    if parent_label:
        context_parts.append(f"Parent node: '{parent_label}'")
    if sibling_labels:
        context_parts.append(f"Sibling nodes: {', '.join(sibling_labels[:5])}")
    if map_topic:
        context_parts.append(f"Overall map topic: '{map_topic}'")

    system = SYSTEM_PROMPT + "\n\nContext:\n" + "\n".join(context_parts)

    history = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in messages[-10:]
    ]
    history.append({"role": "user", "content": new_message})

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=600,
        temperature=0.5,
        system=system,
        messages=history,
    )

    content = response.content[0].text.strip()

    return {
        "conversationId": conversation_id,
        "nodeId": data.get("node_id", ""),
        "content": content,
        "extractedProposals": [],
    }
