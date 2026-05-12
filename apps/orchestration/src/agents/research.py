"""
ResearchAgent — Searches the web via Tavily, synthesizes facts with citations.
Falls back to LLM-only if Tavily is unavailable.
"""
import uuid
import json
from anthropic import Anthropic
from ..config import SONNET_MODEL, HAIKU_MODEL, TAVILY_API_KEY
from ..graph.state import AgentState, ProposalNode

client = Anthropic()

SYNTHESIS_PROMPT = """You are a research assistant synthesizing web search results into mind map nodes.

Rules:
- Each node must be grounded in the search results provided.
- Always note the source index (e.g. "[1]") next to claims.
- Flag when information might be outdated with "as of [date]".
- If sources contradict each other, note the conflict explicitly.
- Keep node labels concise (2-6 words). Content can be 1-2 sentences.
- Do NOT invent facts not present in search results.
- Output valid JSON only.

Output format:
[
  {
    "label": "Short node label",
    "content": "Factual elaboration with source reference",
    "nodeType": "fact",
    "confidence": 0.0-1.0,
    "sourceIndices": [0, 1],
    "hasConflict": false,
    "conflictNote": null
  }
]"""


def run_research_agent(state: AgentState) -> AgentState:
    if "research" not in state.get("agent_plan", []):
        return state

    graph = state.get("graph_snapshot", {})
    topic = state.get("text") or _get_node_label(graph, state.get("node_id")) or "the main topic"

    # Step 1: Search with Tavily
    search_results = []
    tavily_failed = False

    if TAVILY_API_KEY:
        try:
            from tavily import TavilyClient
            tavily = TavilyClient(api_key=TAVILY_API_KEY)
            response = tavily.search(
                query=topic,
                search_depth="advanced",
                max_results=5,
                include_answer=False,
            )
            search_results = response.get("results", [])
        except Exception as e:
            tavily_failed = True
            print(f"[ResearchAgent] Tavily failed: {e}")
    else:
        tavily_failed = True

    # Step 2: Synthesize with Claude
    if search_results:
        results_text = "\n\n".join([
            f"[{i}] {r.get('title', 'No title')} ({r.get('url', '')})\n"
            f"Published: {r.get('published_date', 'unknown date')}\n"
            f"{r.get('content', '')[:500]}"
            for i, r in enumerate(search_results)
        ])
        user_message = f"Research topic: {topic}\n\nSearch results:\n{results_text}\n\nGenerate 3-5 research-backed nodes."
    else:
        # Fallback: LLM knowledge only
        user_message = (
            f"Research topic: {topic}\n\n"
            "NOTE: No live search results available. Generate nodes from training knowledge. "
            "Label each with 'confidence: low' and note they are not web-verified."
        )

    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=1500,
        temperature=0.3,
        system=SYNTHESIS_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    try:
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        suggestions = json.loads(raw.strip())
    except (json.JSONDecodeError, IndexError):
        return {**state, "research_nodes": []}

    nodes: list[ProposalNode] = []
    parent_id = state.get("node_id")

    for s in suggestions:
        source_indices = s.get("sourceIndices", [])
        sources = [
            {
                "url": search_results[i].get("url", ""),
                "title": search_results[i].get("title", ""),
                "domain": _extract_domain(search_results[i].get("url", "")),
                "publishedDate": search_results[i].get("published_date"),
                "excerpt": search_results[i].get("content", "")[:200],
            }
            for i in source_indices
            if i < len(search_results)
        ]

        node: ProposalNode = {
            "tempId": str(uuid.uuid4()),
            "label": s.get("label", "Untitled"),
            "content": s.get("content"),
            "nodeType": "fact",
            "parentId": parent_id,
            "confidence": float(s.get("confidence", 0.7)),
            "sources": sources,
            "metadata": {
                "hasConflict": s.get("hasConflict", False),
                "conflictNote": s.get("conflictNote"),
                "webVerified": not tavily_failed,
                "fallbackMode": tavily_failed,
                "agentVersion": "research-v1.0",
            },
        }
        nodes.append(node)

    return {**state, "research_nodes": nodes}


def _get_node_label(graph: dict, node_id: str | None) -> str | None:
    if not node_id:
        return None
    node = next((n for n in graph.get("nodes", []) if n["id"] == node_id), None)
    return node["label"] if node else None


def _extract_domain(url: str) -> str:
    try:
        from urllib.parse import urlparse
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return url[:30]
