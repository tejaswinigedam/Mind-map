import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { AgentProposal, AgentThinkingEvent, SocraticQuestion, AgentName } from '@mind-map/shared-types'

interface AgentStatus {
  agent: AgentName
  message: string
  startedAt: number
}

interface AgentState {
  // Active agents
  activeAgents: AgentStatus[]

  // Staged proposals (not yet accepted/rejected)
  pendingProposals: AgentProposal[]

  // Socratic questions queue
  pendingQuestion: SocraticQuestion | null

  // Job tracking
  activeJobIds: string[]

  // Actions
  setAgentThinking: (event: AgentThinkingEvent) => void
  clearAgentThinking: (agentName: AgentName) => void
  addProposal: (proposal: AgentProposal) => void
  removeProposal: (proposalId: string) => void
  updateProposalStatus: (proposalId: string, status: AgentProposal['status']) => void
  setSocraticQuestion: (question: SocraticQuestion | null) => void
  addJobId: (jobId: string) => void
  removeJobId: (jobId: string) => void
}

export const useAgentStore = create<AgentState>()(
  immer((set) => ({
    activeAgents: [],
    pendingProposals: [],
    pendingQuestion: null,
    activeJobIds: [],

    setAgentThinking: (event) =>
      set((s) => {
        const idx = s.activeAgents.findIndex((a) => a.agent === event.agent)
        const status: AgentStatus = { agent: event.agent, message: event.message, startedAt: Date.now() }
        if (idx !== -1) s.activeAgents[idx] = status
        else s.activeAgents.push(status)
      }),

    clearAgentThinking: (agentName) =>
      set((s) => {
        s.activeAgents = s.activeAgents.filter((a) => a.agent !== agentName)
      }),

    addProposal: (proposal) =>
      set((s) => {
        // avoid duplicates
        if (!s.pendingProposals.find((p) => p.id === proposal.id)) {
          s.pendingProposals.push(proposal)
        }
      }),

    removeProposal: (proposalId) =>
      set((s) => {
        s.pendingProposals = s.pendingProposals.filter((p: AgentProposal) => p.id !== proposalId)
      }),

    updateProposalStatus: (proposalId, status) =>
      set((s) => {
        const idx = s.pendingProposals.findIndex((p: AgentProposal) => p.id === proposalId)
        if (idx !== -1) s.pendingProposals[idx].status = status
      }),

    setSocraticQuestion: (question) =>
      set((s) => {
        s.pendingQuestion = question
      }),

    addJobId: (jobId) =>
      set((s) => {
        s.activeJobIds.push(jobId)
      }),

    removeJobId: (jobId) =>
      set((s) => {
        s.activeJobIds = s.activeJobIds.filter((id: string) => id !== jobId)
      }),
  })),
)
