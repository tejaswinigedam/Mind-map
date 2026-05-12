import type { FastifyInstance } from 'fastify'

export async function feedbackRoute(app: FastifyInstance) {
  app.post('/', async (req, reply) => {
    const body = req.body as {
      proposalId?: string
      nodeId?: string
      agentName?: string
      eventType: 'thumbs_up' | 'thumbs_down' | 'report'
      freeText?: string
    }

    await app.db.query(
      `INSERT INTO feedback_events (user_id, proposal_id, node_id, agent_name, event_type, free_text)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'dev-user',
        body.proposalId ?? null,
        body.nodeId ?? null,
        body.agentName ?? null,
        body.eventType,
        body.freeText ?? null,
      ],
    )

    return reply.status(201).send({ recorded: true })
  })
}
