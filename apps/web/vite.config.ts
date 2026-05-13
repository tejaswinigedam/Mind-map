import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import https from 'https'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '')

  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})

// Fallback when no API key — generates passable topic-aware labels
function buildFallback(topic: string): { rootLabel: string; branches: Array<{ label: string; subNodes: string[] }> } {
  const t = topic.trim()
  const tl = t.toLowerCase()

  const topicMap: Record<string, any> = {
    habit: [
      { label: 'The Science of Formation', subNodes: ['The habit loop (Cue-Routine-Reward)', 'Neuroplasticity & neural pathways', 'Dopamine feedback loops', 'Basal ganglia role'] },
      { label: 'Strategic Implementation', subNodes: ['Habit stacking techniques', 'Implementation intentions', 'Atomic changes (1% rule)', 'Environment design'] },
      { label: 'Psychological Barriers', subNodes: ['The valley of disappointment', 'Decision fatigue', 'Identity-based friction', 'Overcoming initial resistance'] },
      { label: 'Tracking & Consistency', subNodes: ['Visual habit trackers', 'Accountability systems', 'Maintaining streaks', 'Recovery after failure'] },
      { label: 'Social & Environment', subNodes: ['Social contagion effect', 'Designing for cues', 'Peer accountability', 'Removing negative triggers'] },
    ],
    ai: [
      { label: 'Core Architectures', subNodes: ['Transformers & Attention', 'Neural networks', 'Large Language Models', 'Training methodologies'] },
      { label: 'Ethical Implications', subNodes: ['Algorithmic bias', 'Alignment problem', 'Job displacement', 'Data privacy'] },
      { label: 'Practical Applications', subNodes: ['Agentic workflows', 'Content generation', 'Predictive analytics', 'Scientific discovery'] },
      { label: 'Technical Challenges', subNodes: ['Compute scaling laws', 'Hallucination mitigation', 'Inference optimization', 'Context window limits'] },
    ],
    education: [
      { label: 'Pedagogical Models', subNodes: ['Inquiry-based learning', 'Active recall & repetition', 'Flipped classroom', 'Personalized learning'] },
      { label: 'Technological Shift', subNodes: ['AI in the classroom', 'Virtual environments', 'MOOCs & accessibility', 'Digital literacy'] },
      { label: 'Cognitive Science', subNodes: ['Metacognition', 'Working memory limits', 'Scaffolding techniques', 'Motivation & engagement'] },
    ]
  }

  // Find best match category
  let branches = topicMap.default
  for (const [key, val] of Object.entries(topicMap)) {
    if (tl.includes(key)) {
      branches = val
      break
    }
  }

  // Fallback for unknown topics — make it more dynamic than before
  if (!branches) {
    branches = [
      { label: `Core Mechanisms of ${t}`, subNodes: [`Fundamental principles of ${t}`, `Step-by-step process`, `Interconnected components`, `Primary drivers`] },
      { label: `Practical Implementation`, subNodes: [`Best practices for ${t}`, `Common tools & resources`, `Real-world use cases`, `Optimization strategies`] },
      { label: `Challenges & Obstacles`, subNodes: [`Technical limitations`, `Psychological barriers`, `External dependencies`, `Ethical considerations`] },
      { label: `Evolution & Future Trends`, subNodes: [`Historical development`, `Emerging innovations`, `Long-term predictions`, `Scaling potential`] },
      { label: `Systemic Impact`, subNodes: [`Economic influence`, `Social/Cultural effects`, `Environmental footprint`, `Stakeholder analysis`] },
      { label: `Strategic Perspectives`, subNodes: [`Expert opinions`, `Contrarian views`, `Alternative frameworks`, `Comparative analysis`] },
    ]
  }

  return { rootLabel: t, branches }
}
function buildAgentFallback(nodeId: string, nodeLabel: string): any[] {
  const t = nodeLabel.toLowerCase()
  let labels = [
    `Key components of ${nodeLabel}`,
    `Challenges related to ${nodeLabel}`,
    `Future trends in ${nodeLabel}`,
    `Historical context of ${nodeLabel}`,
    `Best practices for ${nodeLabel}`,
    `Common questions about ${nodeLabel}`,
  ]

  if (t.includes('habit') || t.includes('routine')) {
    labels = [
      'The Cue-Routine-Reward loop',
      'Reducing friction for start',
      'Habit stacking techniques',
      'Implementation intentions',
      'Tracking and accountability',
      'Overcoming the valley of disappointment'
    ]
  } else if (t.includes('ai') || t.includes('intelligence')) {
    labels = [
      'Model architectures',
      'Training data quality',
      'Ethics and bias mitigation',
      'Deployment strategies',
      'Human-in-the-loop systems',
      'Emergent capabilities'
    ]
  } else if (t.includes('climate') || t.includes('carbon')) {
    labels = [
      'Emission reduction targets',
      'Carbon capture technologies',
      'Renewable energy integration',
      'Policy and regulation',
      'Economic incentives',
      'Adaptation and resilience'
    ]
  }

  return [{
    id: Math.random().toString(36).substring(7),
    proposalType: 'nodes',
    agentName: 'BrainstormAgent',
    status: 'pending',
    payload: {
      nodes: labels.map((label) => ({
        tempId: Math.random().toString(36).substring(7),
        label,
        content: `Detailed exploration of ${label}.`,
        nodeType: 'concept',
        parentId: nodeId,
        confidence: 0.7
      }))
    }
  }]
}
