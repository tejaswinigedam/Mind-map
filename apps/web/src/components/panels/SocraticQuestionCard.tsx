import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X, ArrowRight } from 'lucide-react'
import { useAgentStore } from '@/stores/agentStore'
import { getSocket } from '@/lib/socket'

export function SocraticQuestionCard() {
  const question = useAgentStore((s) => s.pendingQuestion)
  const setSocraticQuestion = useAgentStore((s) => s.setSocraticQuestion)
  const [answer, setAnswer] = useState('')
  const [isAnswering, setIsAnswering] = useState(false)

  const handleAnswer = () => {
    if (!answer.trim() || !question) return
    setIsAnswering(true)
    const socket = getSocket()
    socket.emit('socratic:answer', { questionId: question.id, answer: answer.trim() })
    setSocraticQuestion(null)
    setAnswer('')
    setIsAnswering(false)
  }

  const handleDismiss = () => {
    setSocraticQuestion(null)
  }

  return (
    <AnimatePresence>
      {question && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md mx-4 z-50"
        >
          <div className="bg-card border border-border rounded-2xl shadow-panel overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <HelpCircle size={14} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">Clarifying question</p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            {/* Question */}
            <div className="px-4 pb-3">
              <p className="text-sm font-medium text-foreground leading-snug">
                {question.question}
              </p>
            </div>

            {/* Answer input */}
            <div className="px-4 pb-4">
              <div className="flex items-end gap-2 bg-secondary rounded-xl px-3 py-2">
                <textarea
                  autoFocus
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAnswer()
                    }
                    if (e.key === 'Escape') handleDismiss()
                  }}
                  placeholder="Answer to explore deeper... (Esc to dismiss)"
                  rows={2}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed"
                />
                <button
                  onClick={handleAnswer}
                  disabled={!answer.trim() || isAnswering}
                  className="flex-shrink-0 p-1.5 rounded-lg bg-amber-500 text-white disabled:opacity-40 hover:bg-amber-400 transition-colors"
                >
                  <ArrowRight size={12} />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Your answer will expand the mind map with new nodes
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
