import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { MindMapNode, MindMapEdge, MindMap } from '@mind-map/shared-types'

// Depth → color mapping
export const DEPTH_COLORS: Record<number, string> = {
  0: '#3b5bdb',
  1: '#e8590c',
  2: '#2f9e44',
  3: '#7048e8',
  4: '#1098ad',
  5: '#d6336c',
}

export function getDepthColor(depth: number): string {
  return DEPTH_COLORS[Math.min(depth, 5)]
}

interface UndoEntry {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  label: string
}

interface MindMapState {
  // Current map
  currentMap: MindMap | null
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  selectedNodeIds: string[]

  // Undo ring buffer (max 50)
  undoStack: UndoEntry[]
  redoStack: UndoEntry[]

  // Dirty flag
  isDirty: boolean

  // Actions
  setMap: (map: MindMap) => void
  setNodes: (nodes: MindMapNode[]) => void
  setEdges: (edges: MindMapEdge[]) => void
  addNodes: (nodes: MindMapNode[], undoLabel?: string) => void
  updateNode: (nodeId: string, patch: Partial<MindMapNode>) => void
  removeNode: (nodeId: string) => void
  addEdges: (edges: MindMapEdge[]) => void
  removeEdge: (edgeId: string) => void
  selectNode: (nodeId: string, multi?: boolean) => void
  clearSelection: () => void
  updateNodeNote: (nodeId: string, noteContent: string) => void

  // Undo/redo
  snapshot: (label: string) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

const MAX_UNDO = 50

export const useMindMapStore = create<MindMapState>()(
  immer((set, get) => ({
    currentMap: null,
    nodes: [],
    edges: [],
    selectedNodeIds: [],
    undoStack: [],
    redoStack: [],
    isDirty: false,

    setMap: (map) =>
      set((s) => {
        s.currentMap = map
        s.nodes = map.nodes ?? []
        s.edges = map.edges ?? []
        s.undoStack = []
        s.redoStack = []
        s.isDirty = false
      }),

    setNodes: (nodes) =>
      set((s) => {
        s.nodes = nodes
      }),

    setEdges: (edges) =>
      set((s) => {
        s.edges = edges
      }),

    addNodes: (nodes, undoLabel = 'Add nodes') =>
      set((s) => {
        // snapshot before adding
        pushUndo(s, undoLabel)
        s.nodes.push(...nodes)
        s.isDirty = true
      }),

    updateNode: (nodeId, patch) =>
      set((s) => {
        const idx = s.nodes.findIndex((n) => n.id === nodeId)
        if (idx !== -1) Object.assign(s.nodes[idx], patch)
        s.isDirty = true
      }),

    removeNode: (nodeId) =>
      set((s) => {
        pushUndo(s, 'Remove node')
        s.nodes = s.nodes.filter((n) => n.id !== nodeId)
        s.edges = s.edges.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId)
        s.isDirty = true
      }),

    addEdges: (edges) =>
      set((s) => {
        s.edges.push(...edges)
        s.isDirty = true
      }),

    removeEdge: (edgeId) =>
      set((s) => {
        s.edges = s.edges.filter((e) => e.id !== edgeId)
        s.isDirty = true
      }),

    selectNode: (nodeId, multi = false) =>
      set((s) => {
        if (multi) {
          if (s.selectedNodeIds.includes(nodeId)) {
            s.selectedNodeIds = s.selectedNodeIds.filter((id) => id !== nodeId)
          } else {
            s.selectedNodeIds.push(nodeId)
          }
        } else {
          s.selectedNodeIds = [nodeId]
        }
      }),

    clearSelection: () =>
      set((s) => {
        s.selectedNodeIds = []
      }),

    updateNodeNote: (nodeId, noteContent) =>
      set((s) => {
        const idx = s.nodes.findIndex((n) => n.id === nodeId)
        if (idx !== -1) {
          s.nodes[idx].noteContent = noteContent
          s.isDirty = true
        }
      }),

    snapshot: (label) =>
      set((s) => {
        pushUndo(s, label)
      }),

    undo: () =>
      set((s) => {
        const entry = s.undoStack.pop()
        if (!entry) return
        // push current state to redo
        s.redoStack.push({ nodes: [...s.nodes], edges: [...s.edges], label: entry.label })
        s.nodes = entry.nodes
        s.edges = entry.edges
        s.isDirty = true
      }),

    redo: () =>
      set((s) => {
        const entry = s.redoStack.pop()
        if (!entry) return
        pushUndo(s, entry.label)
        s.nodes = entry.nodes
        s.edges = entry.edges
        s.isDirty = true
      }),

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,
  })),
)

function pushUndo(
  s: { undoStack: UndoEntry[]; nodes: MindMapNode[]; edges: MindMapEdge[]; redoStack: UndoEntry[] },
  label: string,
) {
  if (s.undoStack.length >= MAX_UNDO) s.undoStack.shift()
  s.undoStack.push({ nodes: [...s.nodes], edges: [...s.edges], label })
  s.redoStack = [] // clear redo on new action
}
