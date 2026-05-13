"""
AgentRegistry — Centralized management for all specialist agents.
This module maps agent names to their execution functions and handles the orchestration logic.
"""
from typing import Dict, Callable, List
from ..graph.state import AgentState

# Import all agents
from .orchestrator import classify_intent, merge_proposals
from .cognitive_state import identify_cognitive_state
from .memory import retrieve_memory_context
from .learning import run_learning_agent
from .visualization import run_visualization_agent
from .brainstorm import run_brainstorm_agent
from .research import run_research_agent
from .decomposition import run_decomposition_agent
from .onboarding import run_onboarding_agent
from .socratic import run_socratic_agent
from .systems_thinking import run_systems_thinking_agent
from .critical_thinking import run_critical_thinking_agent
from .alternatives import run_alternatives_agent
from .decision_intelligence import run_decision_intelligence_agent
from .synthesis import run_synthesis_agent
from .reflection import run_reflection_agent
from .focus import optimize_focus
from .recommendation import run_recommendation_agent

class AgentRegistry:
    _agents: Dict[str, Callable] = {
        "cognitive_state": identify_cognitive_state,
        "memory": retrieve_memory_context,
        "learning": run_learning_agent,
        "visualization": run_visualization_agent,
        "orchestrator_classify": classify_intent,
        "orchestrator_merge": merge_proposals,
        
        # Specialists
        "brainstorm": run_brainstorm_agent,
        "research": run_research_agent,
        "decomposition": run_decomposition_agent,
        "onboarding": run_onboarding_agent,
        "socratic": run_socratic_agent,
        "systems_thinking": run_systems_thinking_agent,
        "critical_thinking": run_critical_thinking_agent,
        "alternatives": run_alternatives_agent,
        "decision_intelligence": run_decision_intelligence_agent,
        "synthesis": run_synthesis_agent,
        "reflection": run_reflection_agent,
        
        # Optimization
        "focus": optimize_focus,
        "recommendation": run_recommendation_agent,
    }

    @classmethod
    def get_agent(cls, name: str) -> Callable:
        return cls._agents.get(name)

    @classmethod
    def get_all_specialists(cls) -> List[str]:
        return [
            "brainstorm", "research", "decomposition", "onboarding",
            "socratic", "systems_thinking", "critical_thinking",
            "alternatives", "decision_intelligence", "synthesis",
            "reflection"
        ]

    @classmethod
    def get_node_name(cls, agent_name: str) -> str:
        """Maps an internal agent identifier to its graph node name."""
        return f"run_{agent_name}" if agent_name not in ["cognitive_state", "memory", "learning", "visualization", "orchestrator_classify", "orchestrator_merge", "focus", "recommendation"] else agent_name
