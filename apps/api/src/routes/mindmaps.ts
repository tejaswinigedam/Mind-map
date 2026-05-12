import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const CreateMapSchema = z.object({
  title: z.string().min(1).max(200).default('Untitled Map'),
  topic: z.string().optional(),
  purpose: z.enum(['brainstorm', 'research', 'planning', 'learning', 'other']).default('brainstorm'),
})

export async function mindMapsRoute(app: FastifyInstance) {
  // List user's maps
  app.get('/', async (req) => {
    const userId = 'dev-user' // TODO: get from Clerk auth
    const result = await app.db.query(
      `SELECT id, title, topic, purpose, created_at, updated_at
       FROM mind_maps
       WHERE user_id = $1 AND NOT is_deleted
       ORDER BY updated_at DESC
       LIMIT 50`,
      [userId],
    )
    return result.rows
  })

  // Create map
  app.post('/', async (req, reply) => {
    const userId = 'dev-user'
    const body = CreateMapSchema.parse(req.body)

    const result = await app.db.query(
      `INSERT INTO mind_maps (user_id, title, topic, purpose)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, body.title, body.topic ?? null, body.purpose],
    )
    return reply.status(201).send(result.rows[0])
  })

  // Get map with nodes + edges
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { id } = req.params
    const mapResult = await app.db.query(
      `SELECT * FROM mind_maps WHERE id = $1 AND NOT is_deleted`,
      [id],
    )
    if (mapResult.rows.length === 0) return reply.status(404).send({ message: 'Map not found' })

    const [nodesResult, edgesResult] = await Promise.all([
      app.db.query(`SELECT * FROM nodes WHERE mind_map_id = $1 AND NOT is_deleted ORDER BY depth, created_at`, [id]),
      app.db.query(`SELECT * FROM edges WHERE mind_map_id = $1`, [id]),
    ])

    return {
      ...mapResult.rows[0],
      nodes: nodesResult.rows,
      edges: edgesResult.rows,
    }
  })

  // Update map
  app.patch<{ Params: { id: string } }>('/:id', async (req) => {
    const { id } = req.params
    const body = req.body as Partial<z.infer<typeof CreateMapSchema>>

    const result = await app.db.query(
      `UPDATE mind_maps SET
        title = COALESCE($1, title),
        topic = COALESCE($2, topic),
        updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [body.title ?? null, body.topic ?? null, id],
    )
    return result.rows[0]
  })

  // Soft delete
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { id } = req.params
    await app.db.query(`UPDATE mind_maps SET is_deleted = true WHERE id = $1`, [id])
    return reply.status(204).send()
  })

  // Add node
  app.post<{ Params: { id: string } }>('/:id/nodes', async (req, reply) => {
    const { id } = req.params
    const body = req.body as {
      label: string
      parentId?: string
      positionX?: number
      positionY?: number
      depth?: number
      nodeType?: string
    }

    const result = await app.db.query(
      `INSERT INTO nodes (mind_map_id, parent_id, label, node_type, position_x, position_y, depth, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'human')
       RETURNING *`,
      [id, body.parentId ?? null, body.label, body.nodeType ?? 'concept', body.positionX ?? 0, body.positionY ?? 0, body.depth ?? 0],
    )
    return reply.status(201).send(result.rows[0])
  })

  // Update node
  app.patch<{ Params: { id: string; nodeId: string } }>('/:id/nodes/:nodeId', async (req) => {
    const { nodeId } = req.params
    const body = req.body as { label?: string; content?: string; noteContent?: string; positionX?: number; positionY?: number }

    const result = await app.db.query(
      `UPDATE nodes SET
        label = COALESCE($1, label),
        content = COALESCE($2, content),
        note_content = COALESCE($3, note_content),
        position_x = COALESCE($4, position_x),
        position_y = COALESCE($5, position_y),
        updated_at = now()
       WHERE id = $6
       RETURNING *`,
      [body.label ?? null, body.content ?? null, body.noteContent ?? null, body.positionX ?? null, body.positionY ?? null, nodeId],
    )
    return result.rows[0]
  })
}
