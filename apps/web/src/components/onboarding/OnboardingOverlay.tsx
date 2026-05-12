import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Brain, Search, BookOpen, Lightbulb, Map, ArrowRight } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useMindMapStore } from '@/stores/mindMapStore'
import type { MapPurpose, MindMapNode, MindMapEdge } from '@mind-map/shared-types'

interface SeedTopic {
  icon: React.ReactNode
  title: string
  description: string
  color: string
  purpose: MapPurpose
}

const SEED_TOPICS: SeedTopic[] = [
  {
    icon: <Brain size={20} />,
    title: 'Brainstorm an idea',
    description: 'Explore a concept in all directions — no limits',
    color: '#7048e8',
    purpose: 'brainstorm',
  },
  {
    icon: <Search size={20} />,
    title: 'Research a topic',
    description: 'Deep-dive with web sources and citations',
    color: '#1098ad',
    purpose: 'research',
  },
  {
    icon: <Map size={20} />,
    title: 'Plan a project',
    description: 'Break down goals, milestones, and actions',
    color: '#2f9e44',
    purpose: 'planning',
  },
  {
    icon: <BookOpen size={20} />,
    title: 'Learn something new',
    description: 'Build a knowledge map as you study',
    color: '#e8590c',
    purpose: 'learning',
  },
]

const STARTER_QUESTIONS = [
  'What are the second-order effects of AI on education?',
  'How does climate change connect to geopolitical stability?',
  'What makes a great product strategy?',
  'How do I build a habit that actually sticks?',
  'What are the overlooked risks of remote work?',
]

interface OnboardingOverlayProps {
  sessionId: string
  mindMapId: string
}

export function OnboardingOverlay({ sessionId, mindMapId }: OnboardingOverlayProps) {
  const isVisible = useUIStore((s) => s.isOnboardingVisible)
  const setOnboardingVisible = useUIStore((s) => s.setOnboardingVisible)
  const [topic, setTopic] = useState('')
  const [selectedPurpose, setSelectedPurpose] = useState<MapPurpose | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setNodes = useMindMapStore((s) => s.setNodes)
  const setEdges = useMindMapStore((s) => s.setEdges)

  const handleStart = async (text: string, purpose?: MapPurpose) => {
    if (!text.trim()) return
    setIsSubmitting(true)

    try {
      let mapData: { rootLabel: string; branches: Array<{ label: string; subNodes: string[] }> } | null = null

      try {
        const res = await fetch('/api/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: text.trim(), purpose: purpose ?? 'brainstorm' }),
        })
        if (res.ok) {
          mapData = await res.json()
        }
      } catch {
        // API unavailable — fall through to local generation
      }

      const { nodes, edges } = mapData
        ? buildMapFromData(text.trim(), mapData)
        : generateSeedMap(text.trim())

      setNodes(nodes)
      setEdges(edges)
      setOnboardingVisible(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSeedClick = (seed: SeedTopic) => {
    setSelectedPurpose(seed.purpose)
  }

  const handleQuestionClick = (q: string) => {
    handleStart(q)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-2xl mx-4"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Sparkles size={16} className="text-primary" />
                </div>
                <span className="text-sm font-medium text-primary">MindMap AI</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                What are you exploring today?
              </h1>
              <p className="text-muted-foreground text-sm">
                Type a topic, question, or idea — the AI will build your first map
              </p>
            </div>

            {/* Main input */}
            <div className="bg-card border border-border rounded-xl p-1 mb-6 shadow-panel">
              <div className="flex items-center gap-2 px-3 py-2">
                <Lightbulb size={16} className="text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart(topic, selectedPurpose ?? undefined)}
                  placeholder="e.g. The future of education, Climate policy, My startup idea..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <button
                  onClick={() => handleStart(topic, selectedPurpose ?? undefined)}
                  disabled={!topic.trim() || isSubmitting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowRight size={14} />
                      Start
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Purpose tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {SEED_TOPICS.map((seed) => (
                <button
                  key={seed.purpose}
                  onClick={() => handleSeedClick(seed)}
                  className={[
                    'flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all duration-150',
                    selectedPurpose === seed.purpose
                      ? 'border-current bg-current/10'
                      : 'border-border bg-card hover:border-current/50 hover:bg-card/80',
                  ].join(' ')}
                  style={{ color: seed.color }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${seed.color}22` }}
                  >
                    {seed.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{seed.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {seed.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Starter questions */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles size={11} />
                Others are exploring...
              </p>
              <div className="flex flex-wrap gap-2">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuestionClick(q)}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Build map from Claude API response data
// ---------------------------------------------------------------------------

function buildMapFromData(
  topic: string,
  data: { rootLabel: string; branches: Array<{ label: string; subNodes: string[] }> },
): { nodes: MindMapNode[]; edges: MindMapEdge[] } {
  const now = new Date().toISOString()
  const rootId = crypto.randomUUID()
  const branches = data.branches.slice(0, 6)

  const root: MindMapNode = {
    id: rootId,
    mindMapId: 'demo-map',
    parentId: null,
    label: data.rootLabel || topic,
    content: null,
    nodeType: 'concept',
    positionX: 0,
    positionY: 0,
    depth: 0,
    color: null,
    noteContent: null,
    createdBy: 'human',
    isDeleted: false,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  }

  const nodes: MindMapNode[] = [root]
  const edges: MindMapEdge[] = []
  const R = 280
  const R2 = 200

  branches.forEach((branch, i) => {
    const angle = (2 * Math.PI * i) / branches.length - Math.PI / 2
    const childId = crypto.randomUUID()
    const cx = Math.cos(angle) * R
    const cy = Math.sin(angle) * R

    nodes.push({
      id: childId,
      mindMapId: 'demo-map',
      parentId: rootId,
      label: branch.label,
      content: null,
      nodeType: 'concept',
      positionX: cx,
      positionY: cy,
      depth: 1,
      color: null,
      noteContent: null,
      createdBy: 'OnboardingAgent',
      isDeleted: false,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    })

    edges.push({
      id: crypto.randomUUID(),
      mindMapId: 'demo-map',
      sourceId: rootId,
      targetId: childId,
      label: null,
      edgeType: 'child',
      createdBy: 'OnboardingAgent',
      metadata: {},
      createdAt: now,
    })

    const subNodes = (branch.subNodes ?? []).slice(0, 2)
    subNodes.forEach((subLabel, j) => {
      const subAngle = angle + ((j - 0.5) * Math.PI) / branches.length
      const subId = crypto.randomUUID()
      nodes.push({
        id: subId,
        mindMapId: 'demo-map',
        parentId: childId,
        label: subLabel,
        content: null,
        nodeType: 'question',
        positionX: cx + Math.cos(subAngle) * R2,
        positionY: cy + Math.sin(subAngle) * R2,
        depth: 2,
        color: null,
        noteContent: null,
        createdBy: 'OnboardingAgent',
        isDeleted: false,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      })
      edges.push({
        id: crypto.randomUUID(),
        mindMapId: 'demo-map',
        sourceId: childId,
        targetId: subId,
        label: null,
        edgeType: 'child',
        createdBy: 'OnboardingAgent',
        metadata: {},
        createdAt: now,
      })
    })
  })

  return { nodes, edges }
}

// ---------------------------------------------------------------------------
// Seed map generator — creates a radial layout instantly without backend
// ---------------------------------------------------------------------------

const SEED_BRANCHES: Record<string, string[]> = {
  default: [
    'Core Concepts', 'Key Questions', 'Hidden Assumptions',
    'Second-Order Effects', 'Who Benefits?', 'What Could Go Wrong?',
  ],
  ai: [
    'Capabilities & Limits', 'Societal Impact', 'Alignment Problem',
    'Economic Disruption', 'Creative Potential', 'Governance & Policy',
  ],
  climate: [
    'Root Causes', 'Feedback Loops', 'Policy Levers',
    'Economic Trade-offs', 'Tech Solutions', 'Human Behavior',
  ],
  education: [
    'Learning Science', 'Institutional Barriers', 'Technology Role',
    'Equity & Access', 'Future Skills', 'Alternative Models',
  ],
  startup: [
    'Problem Space', 'Customer Insight', 'Business Model',
    'Unfair Advantage', 'Risks & Unknowns', 'Go-to-Market',
  ],
}

function pickBranches(topic: string): string[] {
  const t = topic.toLowerCase()
  if (t.includes('ai') || t.includes('artificial') || t.includes('machine')) return SEED_BRANCHES.ai
  if (t.includes('climate') || t.includes('environment') || t.includes('carbon')) return SEED_BRANCHES.climate
  if (t.includes('education') || t.includes('school') || t.includes('learn')) return SEED_BRANCHES.education
  if (t.includes('startup') || t.includes('business') || t.includes('product')) return SEED_BRANCHES.startup
  return SEED_BRANCHES.default
}

function generateSeedMap(topic: string): { nodes: MindMapNode[]; edges: MindMapEdge[] } {
  const now = new Date().toISOString()
  const branches = pickBranches(topic)
  const rootId = crypto.randomUUID()

  const root: MindMapNode = {
    id: rootId,
    mindMapId: 'demo-map',
    parentId: null,
    label: topic,
    content: null,
    nodeType: 'concept',
    positionX: 0,
    positionY: 0,
    depth: 0,
    color: null,
    noteContent: null,
    createdBy: 'human',
    isDeleted: false,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  }

  const nodes: MindMapNode[] = [root]
  const edges: MindMapEdge[] = []

  // Place child nodes in a circle around root
  const R = 280
  branches.forEach((label, i) => {
    const angle = (2 * Math.PI * i) / branches.length - Math.PI / 2
    const childId = crypto.randomUUID()

    nodes.push({
      id: childId,
      mindMapId: 'demo-map',
      parentId: rootId,
      label,
      content: null,
      nodeType: 'concept',
      positionX: Math.cos(angle) * R,
      positionY: Math.sin(angle) * R,
      depth: 1,
      color: null,
      noteContent: null,
      createdBy: 'OnboardingAgent',
      isDeleted: false,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    })

    edges.push({
      id: crypto.randomUUID(),
      mindMapId: 'demo-map',
      sourceId: rootId,
      targetId: childId,
      label: null,
      edgeType: 'child',
      createdBy: 'OnboardingAgent',
      metadata: {},
      createdAt: now,
    })

    // Add 2 sub-nodes per branch
    const subLabels = getSubLabels(label)
    const R2 = 200
    subLabels.forEach((subLabel, j) => {
      const subAngle = angle + ((j - 0.5) * Math.PI) / branches.length
      const subId = crypto.randomUUID()
      nodes.push({
        id: subId,
        mindMapId: 'demo-map',
        parentId: childId,
        label: subLabel,
        content: null,
        nodeType: 'question',
        positionX: Math.cos(angle) * R + Math.cos(subAngle) * R2,
        positionY: Math.sin(angle) * R + Math.sin(subAngle) * R2,
        depth: 2,
        color: null,
        noteContent: null,
        createdBy: 'OnboardingAgent',
        isDeleted: false,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      })
      edges.push({
        id: crypto.randomUUID(),
        mindMapId: 'demo-map',
        sourceId: childId,
        targetId: subId,
        label: null,
        edgeType: 'child',
        createdBy: 'OnboardingAgent',
        metadata: {},
        createdAt: now,
      })
    })
  })

  return { nodes, edges }
}

const SUB_LABELS: Record<string, string[]> = {
  'Core Concepts':        ['First principles', 'Key definitions'],
  'Key Questions':        ['What do we not know?', 'What are we assuming?'],
  'Hidden Assumptions':   ['Who decides?', 'What is taken for granted?'],
  'Second-Order Effects': ['Unintended consequences', 'Ripple effects'],
  'Who Benefits?':        ['Stakeholders', 'Power dynamics'],
  'What Could Go Wrong?': ['Failure modes', 'Black swans'],
  'Capabilities & Limits':['What it can do', 'Hard limits'],
  'Societal Impact':      ['Job displacement', 'Power concentration'],
  'Alignment Problem':    ['Value alignment', 'Control problem'],
  'Economic Disruption':  ['Winners & losers', 'New markets'],
  'Creative Potential':   ['Art & music', 'Scientific discovery'],
  'Governance & Policy':  ['Regulation', 'International coordination'],
  'Root Causes':          ['Industrial emissions', 'Land use'],
  'Feedback Loops':       ['Tipping points', 'Amplifying cycles'],
  'Policy Levers':        ['Carbon pricing', 'Regulation'],
  'Economic Trade-offs':  ['Jobs vs environment', 'Short vs long term'],
  'Tech Solutions':       ['Renewables', 'Carbon capture'],
  'Human Behavior':       ['Individual action', 'Collective action'],
  'Learning Science':     ['Memory & recall', 'Spaced repetition'],
  'Institutional Barriers':['Funding models', 'Accreditation'],
  'Technology Role':      ['AI tutors', 'Access gaps'],
  'Equity & Access':      ['Digital divide', 'Cost barriers'],
  'Future Skills':        ['Critical thinking', 'Adaptability'],
  'Alternative Models':   ['Unschooling', 'Project-based'],
  'Problem Space':        ['Pain points', 'Market size'],
  'Customer Insight':     ['Who is the user?', 'Jobs to be done'],
  'Business Model':       ['Revenue streams', 'Unit economics'],
  'Unfair Advantage':     ['Distribution edge', 'Unique insight'],
  'Risks & Unknowns':     ['Market risk', 'Execution risk'],
  'Go-to-Market':         ['Early adopters', 'Growth loops'],
}

function getSubLabels(branch: string): string[] {
  return SUB_LABELS[branch] ?? ['Explore further', 'Open question']
}
