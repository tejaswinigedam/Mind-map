import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { motion } from 'framer-motion'
import { MessageSquare, FileText, Brain, Search, Sparkles, PlusCircle } from 'lucide-react'
import { getDepthColor, useMindMapStore } from '@/stores/mindMapStore'
import { useUIStore } from '@/stores/uiStore'
import { useAgentStore } from '@/stores/agentStore'
import { getSocket } from '@/lib/socket'
import type { MindMapNode } from '@mind-map/shared-types'

type CustomNodeData = MindMapNode & { isGhost?: boolean }

const AGENT_ICONS: Record<string, React.ReactNode> = {
  BrainstormAgent: <Brain size={10} />,
  ResearchAgent: <Search size={10} />,
  OnboardingAgent: <Sparkles size={10} />,
}

export const CustomNode = memo(({ data, selected }: NodeProps) => {
  const d = data as CustomNodeData
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(d.label)
  const openNodeChat = useUIStore((s) => s.openNodeChat)

  const setAgentThinking = useAgentStore((s) => s.setAgentThinking)
  const clearAgentThinking = useAgentStore((s) => s.clearAgentThinking)
  const addProposal = useAgentStore((s) => s.addProposal)
  const nodes = useMindMapStore((s) => s.nodes)
  const edges = useMindMapStore((s) => s.edges)

  const depthColor = d.color ?? getDepthColor(d.depth ?? 0)
  const isAI = d.createdBy !== 'human'
  const isGhost = d.isGhost ?? false
  const hasNote = Boolean(d.noteContent)

  const handleDoubleClick = () => {
    if (!isGhost) openNodeChat(d.id)
  }

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isGhost) setIsEditing(true)
  }

  // Duplicate hooks removed

  const handleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isGhost) return

    const socket = getSocket()
    if (!socket.connected) {
      console.warn('Socket not connected, expansion may fail')
    }

    setAgentThinking({ agent: 'BrainstormAgent', message: `Expanding "${d.label}"...` })
    
    socket.emit('agent:request', {
      intent: 'dive_deeper',
      nodeId: d.id,
      nodeLabel: d.label,
      text: '', 
      graphSnapshot: { nodes, edges },
    } as any)
    
    // UI feedback handled by socket events
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isGhost ? 0.7 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      onDoubleClick={handleDoubleClick}
      className={[
        'relative group min-w-[120px] max-w-[200px] px-3 py-2 rounded-node cursor-pointer',
        'transition-all duration-150',
        isGhost
          ? 'border-2 border-dashed bg-card/40 backdrop-blur-sm'
          : 'border border-transparent bg-card',
        selected ? 'shadow-node-selected' : 'shadow-node hover:shadow-node-hover',
      ].join(' ')}
      style={{
        borderColor: isGhost ? depthColor : 'transparent',
        boxShadow: selected
          ? `0 0 0 2px ${depthColor}, 0 4px 20px ${depthColor}44`
          : undefined,
      }}
    >
      {/* Depth color strip */}
      <div
        className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
        style={{ backgroundColor: depthColor }}
      />

      {/* AI shimmer for ghost nodes */}
      {isGhost && (
        <div className="absolute inset-0 rounded-node overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-20 animate-shimmer"
            style={{
              background: `linear-gradient(90deg, transparent, ${depthColor}, transparent)`,
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}

      {/* Agent badge */}
      {isAI && !isGhost && (
        <div
          className="absolute -top-2 -right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium text-white z-10"
          style={{ backgroundColor: depthColor }}
        >
          {AGENT_ICONS[d.createdBy] ?? <Sparkles size={8} />}
          <span>AI</span>
        </div>
      )}

      {/* Note indicator */}
      {hasNote && (
        <div className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center z-10">
          <FileText size={9} className="text-white" />
        </div>
      )}

      {/* Label */}
      <div className="pl-2 pr-1">
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            className="w-full bg-transparent text-sm font-medium text-foreground outline-none border-b border-primary"
          />
        ) : (
          <p
            onClick={handleLabelClick}
            className="text-sm font-medium text-foreground leading-tight select-none"
          >
            {d.label}
          </p>
        )}
      </div>

      {/* Expand Button */}
      {!isGhost && (
        <button
          onClick={handleExpand}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary hover:scale-110 transition-all z-20 group-hover:opacity-100 opacity-0"
        >
          <PlusCircle size={14} />
        </button>
      )}

      {/* Chat hint on hover */}
      {!isGhost && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded-full">
            <MessageSquare size={8} /> double-click to chat
          </span>
        </div>
      )}

      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-border !border-border" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-border !border-border" />
    </motion.div>
  )
})

CustomNode.displayName = 'CustomNode'
