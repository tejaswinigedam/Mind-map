import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, HelpCircle } from 'lucide-react'
import { useMindMapStore } from '@/stores/mindMapStore'
import { useAgentStore } from '@/stores/agentStore'
import { useUIStore } from '@/stores/uiStore'
import { getSocket } from '@/lib/socket'

const SLASH_COMMANDS = [
  { cmd: '/brainstorm', intent: 'brainstorm', desc: 'Generate creative ideas around selected node' },
  { cmd: '/research', intent: 'research', desc: 'Search web and find facts about selected node' },
  { cmd: '/dive deeper', intent: 'dive_deeper', desc: 'Rapidly expand breadth and depth of subtopics' },
  { cmd: '/structure', intent: 'structure', desc: 'Analyze and propose map reorganization' },
  { cmd: '/summarize', intent: 'summarize', desc: 'Summarize selected branch as text' },
  { cmd: '/critique', intent: 'critique', desc: 'Find gaps, contradictions, and redundancies' },
  { cmd: '/challenge', intent: 'challenge', desc: 'Get a Socratic question to challenge assumptions' },
  { cmd: '/undo-all', intent: 'brainstorm', desc: 'Revert all accepted nodes in this session' },
] as const

type Intent = 'brainstorm' | 'research' | 'dive_deeper' | 'structure' | 'summarize' | 'critique' | 'challenge' | 'onboard'

export function AICommandBar() {
  const [input, setInput] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [suggestions, setSuggestions] = useState<typeof SLASH_COMMANDS[number][]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds)
  const nodes = useMindMapStore((s) => s.nodes)
  const edges = useMindMapStore((s) => s.edges)
  const addJobId = useAgentStore((s) => s.addJobId)
  const setCapabilitiesOpen = useUIStore((s) => s.setCapabilitiesOpen)

  const selectedNode = nodes.find((n) => n.id === selectedNodeIds[0])

  useEffect(() => {
    if (input.startsWith('/')) {
      const q = input.toLowerCase()
      setSuggestions(SLASH_COMMANDS.filter((c) => c.cmd.startsWith(q)))
      setSelectedSuggestion(0)
    } else {
      setSuggestions([])
    }
  }, [input])

  const setAgentThinking = useAgentStore((s) => s.setAgentThinking)
  const clearAgentThinking = useAgentStore((s) => s.clearAgentThinking)
  const addProposal = useAgentStore((s) => s.addProposal)

  const dispatch = async (intent: Intent, text: string) => {
    if (!selectedNode && intent !== 'onboard') return

    console.log('[AI] dispatch', intent, text)
    const socket = getSocket()
    
    socket.emit('agent:request', {
      intent,
      text,
      nodeId: selectedNode?.id,
      nodeLabel: selectedNode?.label,
      graphSnapshot: { nodes, edges }
    } as any)

    setInput('')
    setIsExpanded(false)
  }

  const handleSubmit = () => {
    if (!input.trim()) return
    if (input.startsWith('/')) {
      const match = SLASH_COMMANDS.find((c) => input.toLowerCase().startsWith(c.cmd))
      if (match) {
        const rest = input.slice(match.cmd.length).trim()
        dispatch(match.intent as Intent, rest)
      }
    } else {
      dispatch('brainstorm', input)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
    if (e.key === 'Escape') { setIsExpanded(false); setInput('') }
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault()
      setSelectedSuggestion((s) => Math.min(s + 1, suggestions.length - 1))
    }
    if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault()
      setSelectedSuggestion((s) => Math.max(s - 1, 0))
    }
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault()
      setInput(suggestions[selectedSuggestion].cmd + ' ')
    }
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
      {/* Slash command suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mb-1.5 bg-card border border-border rounded-xl overflow-hidden shadow-panel"
          >
            {suggestions.map((s, i) => (
              <button
                key={s.cmd}
                onClick={() => { setInput(s.cmd + ' '); inputRef.current?.focus() }}
                className={[
                  'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                  i === selectedSuggestion ? 'bg-secondary' : 'hover:bg-secondary/50',
                ].join(' ')}
              >
                <span className="text-xs font-mono font-semibold text-primary w-28">{s.cmd}</span>
                <span className="text-xs text-muted-foreground">{s.desc}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command input */}
      <motion.div
        animate={{ scale: isExpanded ? 1.02 : 1 }}
        className="bg-card/90 backdrop-blur-md border border-border rounded-2xl shadow-panel overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <Sparkles size={14} className="text-primary flex-shrink-0" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => setTimeout(() => setIsExpanded(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedNode
                ? `Ask about "${selectedNode.label}" or type /command`
                : 'Type a question or /command...'
            }
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={() => setCapabilitiesOpen(true)}
            className="flex-shrink-0 p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
