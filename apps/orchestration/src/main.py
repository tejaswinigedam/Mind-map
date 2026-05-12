"""
FastAPI entry point for the LangGraph orchestration service.
Internal service — not exposed publicly, called only by the Node.js API.
"""
import uuid
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any

from .graph.workflow import get_workflow
from .graph.state import AgentState, GraphSnapshot
from .agents.node_conversation import run_node_conversation
from .agents.socratic import run_socratic_answer

app = FastAPI(title="Mind Map Orchestration Service", version="1.0.0")


class AgentRequestPayload(BaseModel):
    user_id: str = "dev-user"
    session_id: str = ""
    mind_map_id: str = ""
    socket_id: str = ""
    node_id: Optional[str] = None
    intent: str = "brainstorm"
    text: Optional[str] = None
    graph_snapshot: dict = {}


class ConversationPayload(BaseModel):
    user_id: str = "dev-user"
    session_id: str = ""
    node_id: str
    node_label: str = ""
    node_content: Optional[str] = None
    node_note: Optional[str] = None
    parent_label: Optional[str] = None
    sibling_labels: List[str] = []
    map_topic: str = ""
    messages: List[dict] = []
    new_message: str
    conversation_id: Optional[str] = None


class SocraticAnswerPayload(BaseModel):
    question_id: str
    answer: str
    question: str = ""
    user_id: str = "dev-user"
    session_id: str = ""
    mind_map_id: str = ""
    socket_id: str = ""
    graph_snapshot: dict = {}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/agent/request")
async def agent_request(payload: AgentRequestPayload):
    workflow = get_workflow()

    initial_state: AgentState = {
        "user_id": payload.user_id,
        "session_id": payload.session_id or str(uuid.uuid4()),
        "mind_map_id": payload.mind_map_id,
        "socket_id": payload.socket_id,
        "intent": payload.intent,
        "text": payload.text,
        "node_id": payload.node_id,
        "graph_snapshot": payload.graph_snapshot,
        "agent_plan": [],
        "brainstorm_nodes": [],
        "research_nodes": [],
        "structure_proposal": None,
        "summary_text": None,
        "critique_report": None,
        "onboarding_nodes": [],
        "final_proposals": [],
        "socratic_question": None,
        "user_preferences": {},
        "error": None,
    }

    config = {"configurable": {"thread_id": payload.session_id or str(uuid.uuid4())}}

    try:
        result = await workflow.ainvoke(initial_state, config=config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Build API response
    proposals = _enrich_proposals(result.get("final_proposals", []), payload)
    socratic = None

    if result.get("socratic_question"):
        socratic = {
            "id": str(uuid.uuid4()),
            "mindMapId": payload.mind_map_id,
            "question": result["socratic_question"],
            "triggerNodeCount": len(payload.graph_snapshot.get("nodes", [])),
            "answered": False,
            "answerText": None,
            "generatedNodeIds": [],
        }

    return {
        "proposals": proposals,
        "socratic_question": socratic,
        "error": result.get("error"),
    }


@app.post("/agent/conversation")
async def agent_conversation(payload: ConversationPayload):
    try:
        result = run_node_conversation({
            "node_id": payload.node_id,
            "node_label": payload.node_label,
            "node_content": payload.node_content,
            "node_note": payload.node_note,
            "parent_label": payload.parent_label,
            "sibling_labels": payload.sibling_labels,
            "map_topic": payload.map_topic,
            "messages": payload.messages,
            "new_message": payload.new_message,
            "conversation_id": payload.conversation_id,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result


@app.post("/agent/socratic-answer")
async def socratic_answer(payload: SocraticAnswerPayload):
    state: AgentState = {
        "user_id": payload.user_id,
        "session_id": payload.session_id,
        "mind_map_id": payload.mind_map_id,
        "socket_id": payload.socket_id,
        "intent": "brainstorm",
        "text": payload.answer,
        "node_id": None,
        "graph_snapshot": payload.graph_snapshot,
        "agent_plan": ["brainstorm"],
        "brainstorm_nodes": [],
        "research_nodes": [],
        "structure_proposal": None,
        "summary_text": None,
        "critique_report": None,
        "onboarding_nodes": [],
        "final_proposals": [],
        "socratic_question": None,
        "user_preferences": {},
        "error": None,
        "metadata": {"question": payload.question},
    }

    enriched = run_socratic_answer(state)

    # Now run brainstorm with enriched context
    workflow = get_workflow()
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}
    result = await workflow.ainvoke(enriched, config=config)

    proposals = _enrich_proposals(result.get("final_proposals", []), payload)
    return {"proposals": proposals}


def _enrich_proposals(proposals: list, payload: Any) -> list:
    """Add session/map IDs to proposals before returning."""
    enriched = []
    for p in proposals:
        enriched.append({
            "id": str(uuid.uuid4()),
            "sessionId": getattr(payload, "session_id", ""),
            "mindMapId": getattr(payload, "mind_map_id", ""),
            "promptVersion": "1.0.0",
            "status": "pending",
            "userEdit": None,
            "createdAt": "",
            "resolvedAt": None,
            **p,
        })
    return enriched
