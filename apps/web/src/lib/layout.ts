import dagre from 'dagre'
import type { MindMapNode, MindMapEdge } from '@mind-map/shared-types'

const NODE_WIDTH = 180
const NODE_HEIGHT = 50

export function applyDagreLayout(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  direction: 'TB' | 'LR' = 'LR',
): MindMapNode[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.sourceId, edge.targetId)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    if (!pos) return node
    return {
      ...node,
      positionX: pos.x - NODE_WIDTH / 2,
      positionY: pos.y - NODE_HEIGHT / 2,
    }
  })
}

export function applyRadialLayout(nodes: MindMapNode[], edges: MindMapEdge[]): MindMapNode[] {
  if (nodes.length === 0) return nodes

  const root = nodes.find((n) => n.depth === 0) ?? nodes[0]
  const result: MindMapNode[] = [{ ...root, positionX: 0, positionY: 0 }]
  const placed = new Set([root.id])

  // Build adjacency
  const children: Record<string, string[]> = {}
  edges.forEach((e) => {
    if (!children[e.sourceId]) children[e.sourceId] = []
    children[e.sourceId].push(e.targetId)
  })

  const radii = [0, 250, 450, 650, 800]

  function place(parentId: string, startAngle: number, endAngle: number, depth: number) {
    const kids = (children[parentId] ?? []).filter((id) => !placed.has(id))
    if (kids.length === 0) return
    const step = (endAngle - startAngle) / kids.length
    kids.forEach((childId, i) => {
      const angle = startAngle + step * i + step / 2
      const r = radii[Math.min(depth, radii.length - 1)]
      const node = nodes.find((n) => n.id === childId)
      if (!node) return
      result.push({
        ...node,
        positionX: Math.cos(angle) * r,
        positionY: Math.sin(angle) * r,
      })
      placed.add(childId)
      place(childId, angle - step / 2, angle + step / 2, depth + 1)
    })
  }

  place(root.id, 0, 2 * Math.PI, 1)

  // Add any nodes not placed
  nodes.forEach((n) => {
    if (!placed.has(n.id)) result.push(n)
  })

  return result
}
