import { useCallback, useMemo } from 'react'
import { useEffect, useRef } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { CustomNode } from './CustomNode'
import { useMindMapStore, getDepthColor } from '@/stores/mindMapStore'
import { useAgentStore } from '@/stores/agentStore'
import { useUIStore } from '@/stores/uiStore'
import type { MindMapNode as MMNode, MindMapEdge as MMEdge } from '@mind-map/shared-types'

const nodeTypes = { custom: CustomNode }

// Convert our domain types to React Flow types
function toRFNode(node: MMNode, isGhost = false): Node {
  return {
    id: node.id,
    type: 'custom',
    position: { x: node.positionX, y: node.positionY },
    data: { ...node, isGhost },
    selected: false,
  }
}

function toRFEdge(edge: MMEdge): Edge {
  const color = edge.edgeType === 'contradiction' ? '#f03e3e'
    : edge.edgeType === 'association' ? '#868e96'
    : edge.edgeType === 'reference' ? '#1098ad'
    : '#495057'

  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.label ?? undefined,
    type: 'smoothstep',
    animated: false,
    style: { stroke: color, strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: '#868e96' },
    labelBgStyle: { fill: 'transparent' },
  }
}

function MindMapCanvasInner() {
  const { nodes: mmNodes, edges: mmEdges, setNodes, selectNode, clearSelection } = useMindMapStore()
  const { pendingProposals } = useAgentStore()
  const { layoutType } = useUIStore()
  const { fitView } = useReactFlow()
  const prevNodeCount = useRef(0)

  // Auto-fit when nodes are first added
  useEffect(() => {
    if (mmNodes.length > 0 && prevNodeCount.current === 0) {
      setTimeout(() => fitView({ padding: 0.15, duration: 600 }), 50)
    }
    prevNodeCount.current = mmNodes.length
  }, [mmNodes.length, fitView])

  // Combine real nodes + ghost proposal nodes
  const rfNodes: Node[] = useMemo(() => {
    const real = mmNodes.map((n) => toRFNode(n))
    const ghosts: Node[] = pendingProposals
      .filter((p) => p.status === 'pending' && p.proposalType === 'nodes')
      .flatMap((proposal) =>
        (proposal.payload.nodes ?? []).map((pn: any) => {
          const parent = mmNodes.find((n) => n.id === pn.parentId)
          return toRFNode(
            {
              id: `ghost-${pn.tempId}`,
              mindMapId: '',
              parentId: pn.parentId,
              label: pn.label,
              content: pn.content,
              nodeType: pn.nodeType as MMNode['nodeType'],
              positionX: (parent?.positionX ?? 0) + 200,
              positionY: (parent?.positionY ?? 0),
              depth: (parent?.depth ?? 0) + 1,
              color: null,
              noteContent: null,
              createdBy: proposal.agentName as MMNode['createdBy'],
              isDeleted: false,
              metadata: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            true,
          )
        }),
      )
    return [...real, ...ghosts]
  }, [mmNodes, pendingProposals])

  const rfEdges: Edge[] = useMemo(() => mmEdges.map(toRFEdge), [mmEdges])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updated = applyNodeChanges(changes, rfNodes)
      // sync position changes back to store
      const posChanges = changes.filter((c) => c.type === 'position' && c.position)
      if (posChanges.length > 0) {
        const patchedNodes = mmNodes.map((n) => {
          const pc = posChanges.find((c) => c.type === 'position' && c.id === n.id)
          if (pc && pc.type === 'position' && pc.position) {
            return { ...n, positionX: pc.position.x, positionY: pc.position.y }
          }
          return n
        })
        setNodes(patchedNodes)
      }
      void updated
    },
    [rfNodes, mmNodes, setNodes],
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const updated = applyEdgeChanges(changes, rfEdges)
      void updated
    },
    [rfEdges],
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id)
    },
    [selectNode],
  )

  const onPaneClick = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(255,255,255,0.06)"
        />
        <Controls className="bottom-4 left-4" showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const depth = (node.data as MMNode)?.depth ?? 0
            return getDepthColor(depth)
          }}
          maskColor="rgba(0,0,0,0.6)"
          className="bottom-4 right-4"
        />
        <Panel position="top-left">
          <LayoutBadge current={layoutType} />
        </Panel>
      </ReactFlow>
    </div>
  )
}

export function MindMapCanvas() {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInner />
    </ReactFlowProvider>
  )
}

function LayoutBadge({ current }: { current: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm border border-border rounded-full px-2.5 py-1 pointer-events-none">
      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
      {current} layout
    </div>
  )
}
