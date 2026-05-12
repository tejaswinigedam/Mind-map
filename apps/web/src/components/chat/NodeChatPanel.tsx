import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Plus, FileText, Brain, ChevronRight } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useMindMapStore, getDepthColor } from '@/stores/mindMapStore'
import { useAgentStore } from '@/stores/agentStore'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  extractedCount?: number
}

export function NodeChatPanel() {
  const chatNodeId = useUIStore((s) => s.chatNodeId)
  const closeNodeChat = useUIStore((s) => s.closeNodeChat)
  const node = useMindMapStore((s) => s.nodes.find((n) => n.id === chatNodeId))
  const parentNode = useMindMapStore((s) =>
    node?.parentId ? s.nodes.find((n) => n.id === node.parentId) : null,
  )
  const updateNodeNote = useMindMapStore((s) => s.updateNodeNote)
  const addProposal = useAgentStore((s) => s.addProposal)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [note, setNote] = useState(node?.noteContent ?? '')
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat')
  const [conversationId, setConversationId] = useState<string | undefined>()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Sync note from store
  useEffect(() => {
    setNote(node?.noteContent ?? '')
  }, [node?.noteContent])

  // Listen for conversation replies (when backend is connected)
  useEffect(() => {
    // Placeholder — backend connection wired via useSocket hook in production
  }, [chatNodeId, addProposal])

  const handleSend = () => {
    if (!input.trim() || isLoading || !chatNodeId) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI response in demo mode (replace with socket when backend is live)
    setTimeout(() => {
      setIsLoading(false)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `That's an interesting angle on "${node?.label}". When the AI backend is connected, I'll give you a deep, contextual response here — challenging assumptions, surfacing {{NEW_NODE: Related concept}} ideas, and helping you go further.`,
          timestamp: new Date(),
        },
      ])
    }, 1200)
  }

  const handleNoteChange = (value: string) => {
    setNote(value)
    if (chatNodeId) updateNodeNote(chatNodeId, value)
  }

  if (!node) return null

  const depthColor = getDepthColor(node.depth ?? 0)
  const parentPath = parentNode ? `${parentNode.label} → ` : ''

  return (
    <AnimatePresence>
      {chatNodeId && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l border-border flex flex-col z-30 shadow-panel animate-slide-in-right"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-border">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">
                {parentPath}
              </p>
              <h3
                className="font-semibold text-sm text-foreground truncate"
                style={{ color: depthColor }}
              >
                {node.label}
              </h3>
            </div>
            <button
              onClick={closeNodeChat}
              className="ml-2 p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {(['chat', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors',
                  activeTab === tab
                    ? 'text-foreground border-b-2 -mb-px'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
                style={activeTab === tab ? { borderColor: depthColor } : {}}
              >
                {tab === 'chat' ? <Brain size={12} /> : <FileText size={12} />}
                {tab === 'chat' ? 'Chat' : 'Notes'}
              </button>
            ))}
          </div>

          {/* Chat tab */}
          {activeTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div
                      className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                      style={{ backgroundColor: `${depthColor}22` }}
                    >
                      <Brain size={20} style={{ color: depthColor }} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ask anything about <strong className="text-foreground">{node.label}</strong>.
                      I'll help you go deeper, challenge assumptions, or expand the map.
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={['flex', msg.role === 'user' ? 'justify-end' : 'justify-start'].join(' ')}
                  >
                    <div
                      className={[
                        'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground',
                      ].join(' ')}
                    >
                      <p>{msg.content}</p>
                      {msg.extractedCount && msg.extractedCount > 0 && (
                        <button className="flex items-center gap-1 mt-2 text-[10px] opacity-70 hover:opacity-100 transition-opacity">
                          <Plus size={10} />
                          {msg.extractedCount} idea{msg.extractedCount > 1 ? 's' : ''} found → Add to map
                          <ChevronRight size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <div className="flex items-end gap-2 bg-secondary rounded-xl px-3 py-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Ask about this node..."
                    rows={1}
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none max-h-24 leading-relaxed"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="flex-shrink-0 p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    <Send size={12} />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          )}

          {/* Notes tab */}
          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col p-3 gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Notes for this node</p>
                <div className="flex gap-1">
                  {['Expand', 'Summarize', 'Draft'].map((action) => (
                    <button
                      key={action}
                      className="text-[10px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={note}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder={`Add notes about "${node.label}"...`}
                className="flex-1 bg-secondary rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed"
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
