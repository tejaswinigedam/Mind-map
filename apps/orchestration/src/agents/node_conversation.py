"""
NodeConversationAgent — Powers per-node chat panel.
Maintains conversation scoped to a single node + its position in the map.
Extracts new node proposals from the conversation.
"""
import uuid
import json
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
- Occasionally challenge the user's framing ("You're treating X as a cause — could it be a consequence?")
- When you mention ideas that could become new map nodes, mark them with {{NEW_NODE: label}} syntax
- Keep responses concise (3-5 sentences) unless the user asks for depth
- Be intellectually honest: distinguish what you know confidently from what is uncertain
- Ask a follow-up question at the end of each response to keep the exploration going

When you see {{NEW_NODE: label}} patterns in your response, the system will automatically offer to add those to the map."""

EXTRACT_PROMPT = """Extract any potential new mind map nodes from this AI response.
Look for concepts marked as {{NEW_NODE: label}} or concepts that are clearly distinct ideas worth mapping.
Output JSON array or empty array [].

Format:
[
  {"label": "Concise node label", "content": "Brief elaboration", "nodeType": "concept|fact|question"}
]"""


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

    # Build system context
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

    # Build message history
    history = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in messages[-10:]  # last 10 messages for context window efficiency
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

    # Extract potential new nodes
    extracted_proposals = _extract_proposals(content, data.get("node_id", ""))

    # Clean {{NEW_NODE: x}} markers from display content
    display_content = content.replace("{{", "**").replace("}}", "**")

    return {
        "conversationId": conversation_id,
        "nodeId": data.get("node_id", ""),
        "content": display_content,
        "extractedProposals": extracted_proposals,
    }


def _extract_proposals(content: str, parent_id: str) -> list:
    """Extract NEW_NODE markers from response."""
    import re
    proposals = []
    pattern = r'\{\{NEW_NODE:\s*([^}]+)\}\}'
    matches = re.findall(pattern, content)

    for label in matches:
        proposals.append({
            "id": str(uuid.uuid4()),
            "sessionId": "",
            "mindMapId": "",
            "agentName": "NodeConversationAgent",
            "promptVersion": "1.0.0",
            "proposalType": "nodes",
            "status": "pending",
            "payload": {
                "nodes": [{
                    "tempId": str(uuid.uuid4()),
                    "label": label.strip(),
                    "content": None,
                    "nodeType": "concept",
                    "parentId": parent_id,
                    "confidence": 0.7,
                    "sources": [],
                    "metadata": {"fromConversation": True},
                }]
            },
            "confidenceLevel": "medium",
            "confidenceScore": 0.7,
            "reasoning": f"Surfaced during conversation about '{label.strip()}'",
            "sources": [],
            "userEdit": None,
            "createdAt": "",
            "resolvedAt": None,
        })

    return proposals
