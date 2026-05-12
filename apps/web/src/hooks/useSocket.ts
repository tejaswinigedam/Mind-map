import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { useAgentStore } from '@/stores/agentStore'
import { useMindMapStore } from '@/stores/mindMapStore'
import type { AgentThinkingEvent, AgentProposal, SocraticQuestion } from '@mind-map/shared-types'
import type { MindMapNode, MindMapEdge } from '@mind-map/shared-types'

export function useSocket(mindMapId?: string) {
  const { getToken } = useAuth()
  const setAgentThinking = useAgentStore((s) => s.setAgentThinking)
  const clearAgentThinking = useAgentStore((s) => s.clearAgentThinking)
  const addProposal = useAgentStore((s) => s.addProposal)
  const removeJobId = useAgentStore((s) => s.removeJobId)
  const setSocraticQuestion = useAgentStore((s) => s.setSocraticQuestion)
  const setNodes = useMindMapStore((s) => s.setNodes)
  const setEdges = useMindMapStore((s) => s.setEdges)

  useEffect(() => {
    let mounted = true

    async function init() {
      const token = await getToken()
      if (!token || !mounted) return

      const socket = connectSocket(token)

      if (mindMapId) {
        socket.emit('map:subscribe', { mindMapId })
      }

      socket.on('agent:thinking', (event: AgentThinkingEvent) => {
        setAgentThinking(event)
      })

      socket.on('agent:proposal', (proposal: AgentProposal) => {
        clearAgentThinking(proposal.agentName)
        addProposal(proposal)
        removeJobId('')
      })

      socket.on('agent:error', (err: { jobId: string; message: string; retryable: boolean }) => {
        console.error('[socket] agent error', err)
      })

      socket.on('node:update', ({ nodes, edges }: { nodes: MindMapNode[]; edges: MindMapEdge[] }) => {
        setNodes(nodes)
        setEdges(edges)
      })

      socket.on('socratic:question', (question: SocraticQuestion) => {
        setSocraticQuestion(question)
      })
    }

    init()

    return () => {
      mounted = false
      const socket = getSocket()
      socket.off('agent:thinking')
      socket.off('agent:proposal')
      socket.off('agent:error')
      socket.off('node:update')
      socket.off('socratic:question')
      disconnectSocket()
    }
  }, [mindMapId, getToken, setAgentThinking, clearAgentThinking, addProposal, removeJobId, setSocraticQuestion, setNodes, setEdges])
}
