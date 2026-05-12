import { Undo2, Redo2 } from 'lucide-react'
import { useMindMapStore } from '@/stores/mindMapStore'

export function UndoRedoControls() {
  const undo = useMindMapStore((s) => s.undo)
  const redo = useMindMapStore((s) => s.redo)
  const canUndo = useMindMapStore((s) => s.canUndo())
  const canRedo = useMindMapStore((s) => s.canRedo())

  return (
    <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg p-0.5">
      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Undo2 size={13} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Redo2 size={13} />
      </button>
    </div>
  )
}
