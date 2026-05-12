import type { FastifyInstance } from 'fastify'

export async function proposalsRoute(app: FastifyInstance) {
  // Accept proposal
  app.post<{ Params: { proposalId: string } }>(
    '/proposals/:proposalId/accept',
    async (req, reply) => {
      const { proposalId } = req.params
      const body = req.body as { editedPayload?: unknown }

      const client = await app.db.connect()
      try {
        await client.query('BEGIN')

        // Get proposal
        const propResult = await client.query(
          `SELECT * FROM agent_proposals WHERE id = $1 AND status = 'pending'`,
          [proposalId],
        )
        if (propResult.rows.length === 0) {
          await client.query('ROLLBACK')
          return reply.status(404).send({ message: 'Proposal not found or already resolved' })
        }

        const proposal = propResult.rows[0]
        const payload = body.editedPayload ?? proposal.payload

        // Insert nodes from proposal
        if (payload.nodes && Array.isArray(payload.nodes)) {
          for (const node of payload.nodes) {
            await client.query(
              `INSERT INTO nodes (mind_map_id, parent_id, label, content, node_type, position_x, position_y, depth, created_by, metadata)
               VALUES ($1, $2, $3, $4, $5, 0, 0, $6, $7, $8)`,
              [
                proposal.mind_map_id,
                node.parentId ?? null,
                node.label,
                node.content ?? null,
                node.nodeType ?? 'concept',
                1,
                proposal.agent_name,
                JSON.stringify(node.metadata ?? {}),
              ],
            )
          }
        }

        // Update proposal status
        await client.query(
          `UPDATE agent_proposals SET status = 'accepted', resolved_at = now(), user_edit = $1 WHERE id = $2`,
          [body.editedPayload ? JSON.stringify(body.editedPayload) : null, proposalId],
        )

        // Record feedback
        await client.query(
          `INSERT INTO feedback_events (user_id, proposal_id, event_type, agent_name, prompt_version)
           VALUES ($1, $2, 'accept', $3, $4)`,
          ['dev-user', proposalId, proposal.agent_name, proposal.prompt_version],
        )

        await client.query('COMMIT')
        return reply.status(200).send({ accepted: true })
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    },
  )

  // Reject proposal
  app.post<{ Params: { proposalId: string } }>(
    '/proposals/:proposalId/reject',
    async (req, reply) => {
      const { proposalId } = req.params
      const { reason } = req.body as { reason?: string }

      await app.db.query(
        `UPDATE agent_proposals SET status = 'rejected', resolved_at = now() WHERE id = $1`,
        [proposalId],
      )

      await app.db.query(
        `INSERT INTO feedback_events (user_id, proposal_id, event_type, free_text)
         VALUES ($1, $2, 'reject', $3)`,
        ['dev-user', proposalId, reason ?? null],
      )

      return reply.status(200).send({ rejected: true })
    },
  )
}
