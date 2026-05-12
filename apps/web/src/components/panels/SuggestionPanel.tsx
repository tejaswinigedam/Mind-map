import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Loader2 } from 'lucide-react'
import { useAgentStore } from '@/stores/agentStore'
import { useUIStore } from '@/stores/uiStore'
import { ProposalCard } from './ProposalCard'

export function SuggestionPanel() {
  const isSuggestionPanelOpen = useUIStore((s) => s.isSuggestionPanelOpen)
  const toggleSuggestionPanel = useUIStore((s) => s.toggleSuggestionPanel)
  const pendingProposals = useAgentStore((s) => s.pendingProposals)
  const activeAgents = useAgentStore((s) => s.activeAgents)

  return (
    <AnimatePresence initial={false}>
      {isSuggestionPanelOpen ? (
        <motion.div
          key="panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="relative flex-shrink-0 bg-card border-l border-border flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">AI Suggestions</h2>
              {pendingProposals.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                  {pendingProposals.length}
                </span>
              )}
            </div>
            <button
              onClick={toggleSuggestionPanel}
              className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Active agents */}
          {activeAgents.length > 0 && (
            <div className="px-3 py-2 border-b border-border space-y-1.5">
              {activeAgents.map((a) => (
                <div key={a.agent} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={11} className="animate-spin text-primary flex-shrink-0" />
                  <span className="truncate">{a.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Proposals */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pendingProposals.length === 0 && activeAgents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select a node and use the AI command bar to generate suggestions.
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  Try: /brainstorm · /research · /dive-deeper
                </p>
              </div>
            )}
            <AnimatePresence>
              {pendingProposals
                .filter((p) => p.status === 'pending')
                .map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : (
        <motion.button
          key="tab"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={toggleSuggestionPanel}
          className="flex-shrink-0 w-8 bg-card border-l border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <span className="text-[10px] font-medium text-muted-foreground -rotate-90 whitespace-nowrap">
            Suggestions
            {pendingProposals.length > 0 ? ` (${pendingProposals.length})` : ''}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
