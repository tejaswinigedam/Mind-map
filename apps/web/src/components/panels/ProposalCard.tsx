import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useAgentStore } from '@/stores/agentStore'
import { useMindMapStore } from '@/stores/mindMapStore'
import { getSocket } from '@/lib/socket'
import type { AgentProposal, ConfidenceLevel } from '@mind-map/shared-types'

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: '#2f9e44',
  medium: '#e8590c',
  low: '#868e96',
}

const AGENT_LABELS: Record<string, string> = {
  BrainstormAgent: 'Brainstorm',
  ResearchAgent: 'Research',
  StructureAgent: 'Structure',
  OnboardingAgent: 'Onboarding',
  NodeConversationAgent: 'From chat',
}

interface ProposalCardProps {
  proposal: AgentProposal
}

export function ProposalCard({ proposal }: ProposalCardProps) {
  const [isReasoningOpen, setIsReasoningOpen] = useState(false)
  const [isSourcesOpen, setIsSourcesOpen] = useState(false)
  const removeProposal = useAgentStore((s) => s.removeProposal)
  const addNodes = useMindMapStore((s) => s.addNodes)

  const handleAccept = () => {
    const socket = getSocket()
    socket.emit('proposal:accept', { proposalId: proposal.id })

    // Optimistically add nodes to canvas
    if (proposal.payload.nodes) {
      const now = new Date().toISOString()
      addNodes(
        proposal.payload.nodes.map((pn) => ({
          id: crypto.randomUUID(),
          mindMapId: proposal.mindMapId,
          parentId: pn.parentId,
          label: pn.label,
          content: pn.content,
          nodeType: pn.nodeType as 'concept',
          positionX: 0,
          positionY: 0,
          depth: 1,
          color: null,
          noteContent: null,
          createdBy: proposal.agentName as 'BrainstormAgent',
          isDeleted: false,
          metadata: pn.metadata ?? {},
          createdAt: now,
          updatedAt: now,
        })),
        `Accept proposal from ${proposal.agentName}`,
      )
    }
    removeProposal(proposal.id)
  }

  const handleReject = () => {
    const socket = getSocket()
    socket.emit('proposal:reject', { proposalId: proposal.id })
    removeProposal(proposal.id)
  }

  const handleRetry = () => {
    const socket = getSocket()
    socket.emit('proposal:retry', { proposalId: proposal.id })
    removeProposal(proposal.id)
  }

  const nodeCount = proposal.payload.nodes?.length ?? 0
  const confColor = CONFIDENCE_COLORS[proposal.confidenceLevel]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {AGENT_LABELS[proposal.agentName] ?? proposal.agentName}
          </span>
          {nodeCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {nodeCount} node{nodeCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {/* Confidence bar */}
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            {(['low', 'medium', 'high'] as ConfidenceLevel[]).map((level) => (
              <div
                key={level}
                className="w-3 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    (level === 'low') ||
                    (level === 'medium' && proposal.confidenceLevel !== 'low') ||
                    (level === 'high' && proposal.confidenceLevel === 'high')
                      ? confColor
                      : 'hsl(var(--border))',
                }}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground capitalize">{proposal.confidenceLevel}</span>
        </div>
      </div>

      {/* Proposed nodes preview */}
      {proposal.payload.nodes && (
        <div className="px-3 pb-2 space-y-1">
          {proposal.payload.nodes.slice(0, 4).map((pn) => (
            <div key={pn.tempId} className="flex items-center gap-1.5 text-xs">
              <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
              <span className="text-foreground font-medium truncate">{pn.label}</span>
            </div>
          ))}
          {proposal.payload.nodes.length > 4 && (
            <p className="text-[10px] text-muted-foreground pl-2.5">
              +{proposal.payload.nodes.length - 4} more
            </p>
          )}
        </div>
      )}

      {/* Reasoning (collapsible) */}
      {proposal.reasoning && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setIsReasoningOpen(!isReasoningOpen)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {isReasoningOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Why did AI suggest this?
          </button>
          {isReasoningOpen && (
            <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed bg-secondary/50 rounded-lg p-2">
              {proposal.reasoning}
            </p>
          )}
        </div>
      )}

      {/* Sources (collapsible) */}
      {proposal.sources.length > 0 && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setIsSourcesOpen(!isSourcesOpen)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSourcesOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {proposal.sources.length} source{proposal.sources.length > 1 ? 's' : ''}
          </button>
          {isSourcesOpen && (
            <div className="mt-1.5 space-y-1.5">
              {proposal.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-1.5 text-[10px] text-muted-foreground hover:text-foreground group"
                >
                  <ExternalLink size={9} className="mt-0.5 flex-shrink-0 group-hover:text-primary" />
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">{src.title}</p>
                    <p className="opacity-60">{src.domain} · {src.publishedDate ?? 'date unknown'}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 px-3 pb-3 pt-1 border-t border-border mt-1">
        <button
          onClick={handleAccept}
          className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
        >
          <Check size={12} /> Accept
        </button>
        <button
          onClick={handleReject}
          className="flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs transition-colors"
        >
          <X size={12} />
        </button>
        <button
          onClick={handleRetry}
          className="flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          <RefreshCw size={12} />
        </button>
        <button className="flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs transition-colors">
          <AlertTriangle size={12} />
        </button>
      </div>
    </motion.div>
  )
}
