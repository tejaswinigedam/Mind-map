import { TopNav } from '@/components/layout/TopNav'
import { MindMapCanvas } from '@/components/canvas/MindMapCanvas'
import { SuggestionPanel } from '@/components/panels/SuggestionPanel'
import { NodeChatPanel } from '@/components/chat/NodeChatPanel'
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay'
import { AICommandBar } from '@/components/ai/AICommandBar'
import { SocraticQuestionCard } from '@/components/panels/SocraticQuestionCard'
import { UndoRedoControls } from '@/components/feedback/UndoRedoControls'
import { useMindMapStore } from '@/stores/mindMapStore'
import { useUIStore } from '@/stores/uiStore'

const SESSION_ID = 'demo-session'
const MAP_ID = 'demo-map'

export default function App() {
  const nodeCount = useMindMapStore((s) => s.nodes.length)
  const chatNodeId = useUIStore((s) => s.chatNodeId)

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: 'hsl(222 47% 7%)' }}>
      <TopNav />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <MindMapCanvas />

          {/* Onboarding overlay — only shown when map is empty */}
          {nodeCount === 0 && (
            <OnboardingOverlay sessionId={SESSION_ID} mindMapId={MAP_ID} />
          )}

          {/* Floating AI command bar */}
          <AICommandBar />

          {/* Socratic question card */}
          <SocraticQuestionCard />

          {/* Bottom bar */}
          <div className="absolute bottom-6 left-4 flex items-center gap-2">
            <UndoRedoControls />
          </div>
        </div>

        {/* Node chat panel — slides in over canvas */}
        {chatNodeId && (
          <div className="absolute right-0 top-0 bottom-0 z-30">
            <NodeChatPanel />
          </div>
        )}

        {/* Suggestion panel — right sidebar */}
        {!chatNodeId && <SuggestionPanel />}
      </div>
    </div>
  )
}
