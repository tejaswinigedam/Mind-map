import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { createServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '@mind-map/shared-types'

import { dbPlugin } from './plugins/database.js'
import { redisPlugin } from './plugins/redis.js'
import { bullPlugin } from './plugins/bullmq.js'
import { mindMapsRoute } from './routes/mindmaps.js'
import { proposalsRoute } from './routes/proposals.js'
import { feedbackRoute } from './routes/feedback.js'
import { exportRoute } from './routes/export.js'
import { usersRoute } from './routes/users.js'
import { registerSocketHandlers } from './socket.js'

const PORT = Number(process.env.PORT ?? 3001)

async function bootstrap() {
  const app = Fastify({ logger: { level: 'info' } })

  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  })

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  })

  await app.register(dbPlugin)
  await app.register(redisPlugin)
  await app.register(bullPlugin)

  // REST routes
  await app.register(mindMapsRoute, { prefix: '/api/mindmaps' })
  await app.register(proposalsRoute, { prefix: '/api' })
  await app.register(feedbackRoute, { prefix: '/api/feedback' })
  await app.register(exportRoute, { prefix: '/api/export' })
  await app.register(usersRoute, { prefix: '/api/users' })

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  // Create raw http server so Socket.IO can attach
  const httpServer = createServer(app.server)

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  registerSocketHandlers(io)

  await app.ready()

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`API + Socket.IO listening on port ${PORT}`)
  })
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
