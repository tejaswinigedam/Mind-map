import type { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, AgentRequestPayload, NodeConversationPayload } from '@mind-map/shared-types'
import { Queue } from 'bullmq'

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
}

const agentTasksQueue = new Queue('agent-tasks', { connection })

// Per-user rate limiting counters stored in Redis (via socket-accessible redis)
// Simplified here; full implementation uses ioredis sliding window

export function registerSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.use(async (socket, next) => {
    // Auth: verify Clerk JWT from socket.auth.token
    const token = (socket.handshake.auth as { token?: string }).token
    if (!token) {
      return next(new Error('Authentication required'))
    }
    // In production: verify token with Clerk SDK
    // socket.data.userId = verifiedUserId
    socket.data.userId = 'dev-user'
    next()
  })

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`)

    socket.on('map:subscribe', ({ mindMapId }) => {
      socket.join(`map:${mindMapId}`)
    })

    socket.on('agent:request', async (payload: AgentRequestPayload) => {
      const job = await agentTasksQueue.add(
        'agent-request',
        {
          ...payload,
          userId: socket.data.userId,
          socketId: socket.id,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      )

      socket.emit('agent:ack', { jobId: job.id! })
    })

    socket.on('node:conversation', async (payload: NodeConversationPayload) => {
      await agentTasksQueue.add(
        'node-conversation',
        {
          ...payload,
          userId: socket.data.userId,
          socketId: socket.id,
        },
        {
          attempts: 2,
          backoff: { type: 'fixed', delay: 1000 },
          removeOnComplete: { count: 200 },
        },
      )
    })

    socket.on('socratic:answer', async ({ questionId, answer }) => {
      await agentTasksQueue.add(
        'socratic-answer',
        {
          questionId,
          answer,
          userId: socket.data.userId,
          socketId: socket.id,
        },
        { attempts: 2 },
      )
    })

    socket.on('proposal:accept', async ({ proposalId, editedPayload }) => {
      await agentTasksQueue.add('proposal-accept', {
        proposalId,
        editedPayload,
        userId: socket.data.userId,
      })
    })

    socket.on('proposal:reject', async ({ proposalId, reason }) => {
      await agentTasksQueue.add('proposal-reject', {
        proposalId,
        reason,
        userId: socket.data.userId,
      })
    })

    socket.on('proposal:retry', async ({ proposalId }) => {
      await agentTasksQueue.add('proposal-retry', {
        proposalId,
        userId: socket.data.userId,
        socketId: socket.id,
      })
    })

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`)
    })
  })
}
