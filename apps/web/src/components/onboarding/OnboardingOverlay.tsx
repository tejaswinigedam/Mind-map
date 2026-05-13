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
                <span className="text-sm font-medium text-primary">MindMap</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                What are you exploring today?
              </h1>
              <p className="text-muted-foreground text-sm">
                Type a topic, question, or idea - the app will build your first map
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
  const branches = data.branches.slice(0, 10)

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

    const subNodes = (branch.subNodes ?? []).slice(0, 4)
    subNodes.forEach((sub, j) => {
      const subLabel = sub

      const subAngle = angle + ((j - (subNodes.length - 1) / 2) * 0.4)
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
    'Historical Context', 'Future Trajectory', 'Ethical Implications', 'Systemic Constraints',
  ],
  ai: [
    'Capabilities & Limits', 'Societal Impact', 'Alignment Problem',
    'Economic Disruption', 'Creative Potential', 'Governance & Policy',
    'Human-AI Collaboration', 'Algorithmic Bias', 'Hardware Requirements', 'Safety Research',
  ],
  climate: [
    'Root Causes', 'Feedback Loops', 'Policy Levers',
    'Economic Trade-offs', 'Tech Solutions', 'Human Behavior',
    'Global Inequity', 'Biodiversity Loss', 'Adaptation Strategies', 'Corporate Responsibility',
  ],
  education: [
    'Learning Science', 'Institutional Barriers', 'Technology Role',
    'Equity & Access', 'Future Skills', 'Alternative Models',
    'Cognitive Development', 'Assessment Methods', 'Lifelong Learning', 'Teacher Support',
  ],
  startup: [
    'Problem Space', 'Customer Insight', 'Business Model',
    'Unfair Advantage', 'Risks & Unknowns', 'Go-to-Market',
    'Scalability', 'Team Dynamics', 'Funding Options', 'Competitive Landscape',
  ],
  habits: [
    'The Habit Loop', 'Atomic Changes', 'Identity-Based Habits',
    'Environment Design', 'Social Influence', 'Overcoming Plateaus',
    'Tracking & Review', 'Habit Stacking', 'Temptation Bundling', 'Reward Systems',
  ],
}

function pickBranches(topic: string): string[] {
  const t = topic.toLowerCase()
  if (t.includes('ai') || t.includes('artificial') || t.includes('machine')) return SEED_BRANCHES.ai
  if (t.includes('climate') || t.includes('environment') || t.includes('carbon')) return SEED_BRANCHES.climate
  if (t.includes('education') || t.includes('school') || t.includes('learn')) return SEED_BRANCHES.education
  if (t.includes('startup') || t.includes('business') || t.includes('product')) return SEED_BRANCHES.startup
  if (t.includes('habit') || t.includes('routine') || t.includes('behavior')) return SEED_BRANCHES.habits
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

    // Add up to 4 sub-nodes per branch
    const subLabels = getSubLabels(label)
    const R2 = 200
    subLabels.forEach((subLabel, j) => {
      const subAngle = angle + ((j - (subLabels.length - 1) / 2) * 0.4)
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
    })
  })

  return { nodes, edges }
}

const SUB_LABELS: Record<string, string[]> = {
  'Core Concepts':        ['First principles', 'Key definitions', 'Conceptual framework', 'Mental models'],
  'Key Questions':        ['What do we not know?', 'What are we assuming?', 'What is the root cause?', 'How does this evolve?'],
  'Hidden Assumptions':   ['Who decides?', 'What is taken for granted?', 'Implicit biases', 'Underlying values'],
  'Second-Order Effects': ['Unintended consequences', 'Ripple effects', 'Delayed reactions', 'Counter-intuitive results'],
  'Who Benefits?':        ['Stakeholders', 'Power dynamics', 'Marginalized groups', 'Indirect winners'],
  'What Could Go Wrong?': ['Failure modes', 'Black swans', 'Worst-case scenarios', 'Systemic fragility'],
  'Historical Context':   ['Origins', 'Key milestones', 'Past failures', 'Cyclical patterns'],
  'Future Trajectory':    ['Scenario planning', 'Wild cards', 'Probable outcomes', 'Desired future'],
  'Ethical Implications': ['Moral trade-offs', 'Responsibility', 'Justice & Equity', 'Rights & Duties'],
  'Systemic Constraints': ['Resource limits', 'Physical laws', 'Political boundaries', 'Temporal factors'],
  'Capabilities & Limits':['What it can do', 'Hard limits', 'State of the art', 'Computational bounds'],
  'Societal Impact':      ['Job displacement', 'Power concentration', 'Social cohesion', 'Human dignity'],
  'Alignment Problem':    ['Value alignment', 'Control problem', 'Incentive design', 'Human-centeredness'],
  'Economic Disruption':  ['Winners & losers', 'New markets', 'Labor shifts', 'Wealth distribution'],
  'Creative Potential':   ['Art & music', 'Scientific discovery', 'New forms of expression', 'Human-AI co-creation'],
  'Governance & Policy':  ['Regulation', 'International coordination', 'Standard setting', 'Liability frameworks'],
  'Human-AI Collaboration':['Augmented intelligence', 'Decision support', 'Skill preservation', 'Human-in-the-loop'],
  'Algorithmic Bias':     ['Data representation', 'Transparency', 'Fairness metrics', 'Feedback loops'],
  'Hardware Requirements':['Compute resources', 'Energy consumption', 'Supply chains', 'Specialized chips'],
  'Safety Research':      ['Robustness', 'Interpretability', 'Formal verification', 'Containment'],
  'Root Causes':          ['Industrial emissions', 'Land use', 'Deforestation', 'Methane leaks'],
  'Feedback Loops':       ['Tipping points', 'Amplifying cycles', 'Self-reinforcing effects', 'Dampening mechanisms'],
  'Policy Levers':        ['Carbon pricing', 'Regulation', 'Subsidies', 'International treaties'],
  'Economic Trade-offs':  ['Jobs vs environment', 'Short vs long term', 'Development vs conservation', 'Market externalities'],
  'Tech Solutions':       ['Renewables', 'Carbon capture', 'Energy storage', 'Nuclear fusion'],
  'Human Behavior':       ['Individual action', 'Collective action', 'Consumption patterns', 'Political will'],
  'Global Inequity':      ['Global North vs South', 'Climate justice', 'Technology transfer', 'Resource access'],
  'Biodiversity Loss':    ['Ecosystem collapse', 'Extinction rates', 'Trophic cascades', 'Genetic diversity'],
  'Adaptation Strategies':['Resilient infrastructure', 'Managed retreat', 'Crop diversification', 'Disaster preparedness'],
  'Corporate Responsibility':['ESG metrics', 'Greenwashing', 'Supply chain audits', 'Sustainable investment'],
  'Learning Science':     ['Memory & recall', 'Spaced repetition', 'Cognitive load', 'Metacognition'],
  'Institutional Barriers':['Funding models', 'Accreditation', 'Siloed disciplines', 'Resistance to change'],
  'Technology Role':      ['AI tutors', 'Access gaps', 'Personalized learning', 'Immersive environments'],
  'Equity & Access':      ['Digital divide', 'Cost barriers', 'Inclusive design', 'Language access'],
  'Future Skills':        ['Critical thinking', 'Adaptability', 'Emotional intelligence', 'Digital literacy'],
  'Alternative Models':   ['Unschooling', 'Project-based', 'Montessori', 'Flipped classrooms'],
  'Cognitive Development':['Brain plasticity', 'Executive function', 'Social-emotional learning', 'Motivation'],
  'Assessment Methods':   ['Standardized testing', 'Portfolio assessment', 'Continuous feedback', 'Skill badges'],
  'Lifelong Learning':    ['Upskilling', 'Micro-credentials', 'Self-directed learning', 'Community education'],
  'Teacher Support':      ['Professional development', 'Workload reduction', 'Autonomy', 'Collaboration tools'],
  'Problem Space':        ['Pain points', 'Market size', 'Urgency', 'Frequency'],
  'Customer Insight':     ['Who is the user?', 'Jobs to be done', 'User journey', 'Empathy mapping'],
  'Business Model':       ['Revenue streams', 'Unit economics', 'Retention strategy', 'Pricing strategy'],
  'Unfair Advantage':     ['Distribution edge', 'Unique insight', 'Network effects', 'Intellectual property'],
  'Risks & Unknowns':     ['Market risk', 'Execution risk', 'Regulatory risk', 'Technical risk'],
  'Go-to-Market':         ['Early adopters', 'Growth loops', 'Channel strategy', 'Brand positioning'],
  'Scalability':          ['Viral loops', 'Infrastructural needs', 'Process automation', 'Global expansion'],
  'Team Dynamics':        ['Culture', 'Hiring strategy', 'Shared vision', 'Conflict resolution'],
  'Funding Options':      ['Bootstrapping', 'Venture capital', 'Angel investors', 'Crowdfunding'],
  'Competitive Landscape':['Direct competitors', 'Indirect threats', 'Substitute products', 'Market fragmentation'],
  'The Habit Loop':       ['Cue/Trigger', 'Craving', 'Response/Routine', 'Reward'],
  'Atomic Changes':       ['1% gains', 'Starting small', 'Consistency vs Intensity', 'Compound effects'],
  'Identity-Based Habits':['Who you want to be', 'Small wins', 'Self-image', 'Belief systems'],
  'Environment Design':   ['Reducing friction', 'Visual cues', 'Context switching', 'Designing for success'],
  'Social Influence':     ['Peer groups', 'Accountability', 'Social norms', 'Role models'],
  'Overcoming Plateaus':  ['Valley of disappointment', 'Plateau of latent potential', 'Sticking with it', 'System adjustments'],
  'Tracking & Review':    ['Habit trackers', 'Reflective practice', 'Data-driven insights', 'Adjusting goals'],
  'Habit Stacking':       ['After [current habit], I will [new habit]', 'Trigger mapping', 'Anchoring', 'Sequence design'],
  'Temptation Bundling':  ['Pairing wants with needs', 'Immediate gratification', 'Long-term rewards', 'Incentive design'],
  'Reward Systems':       ['Dopamine hits', 'Intrinsic vs Extrinsic', 'Celebrating wins', 'Reinforcement'],
}

function getSubLabels(branch: string): string[] {
  return SUB_LABELS[branch] ?? ['Explore further', 'Open question']
}
