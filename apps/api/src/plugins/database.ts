import fp from 'fastify-plugin'
import { Pool } from 'pg'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool
  }
}

export const dbPlugin = fp(async (app: FastifyInstance) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
  })

  await pool.query('SELECT 1') // health check
  app.decorate('db', pool)

  app.addHook('onClose', async () => {
    await pool.end()
  })
})
