import type { FastifyInstance } from 'fastify'

export async function usersRoute(app: FastifyInstance) {
  app.get('/me/preferences', async () => {
    const result = await app.db.query(
      `SELECT * FROM user_preferences WHERE user_id = (SELECT id FROM users WHERE clerk_id = $1)`,
      ['dev-user'],
    )
    return result.rows[0] ?? {}
  })

  app.patch('/me/preferences', async (req) => {
    const body = req.body as {
      aiVerbosity?: string
      layoutPreference?: string
      personalizationOptIn?: boolean
    }

    await app.db.query(
      `INSERT INTO user_preferences (user_id, ai_verbosity, layout_preference, personalization_opt_in)
       VALUES ((SELECT id FROM users WHERE clerk_id = $1), $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         ai_verbosity = COALESCE($2, user_preferences.ai_verbosity),
         layout_preference = COALESCE($3, user_preferences.layout_preference),
         personalization_opt_in = COALESCE($4, user_preferences.personalization_opt_in),
         updated_at = now()`,
      ['dev-user', body.aiVerbosity ?? null, body.layoutPreference ?? null, body.personalizationOptIn ?? null],
    )

    return { updated: true }
  })
}
