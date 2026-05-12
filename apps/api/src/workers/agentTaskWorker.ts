import { Worker, type Job } from 'bullmq'
import axios from 'axios'
import { Server } from 'socket.io'

const ORCH_URL = process.env.ORCHESTRATION_SERVICE_URL ?? 'http://localhost:8001'

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
}

export function startAgentTaskWorker(io: Server) {
  const worker = new Worker(
    'agent-tasks',
    async (job: Job) => {
      const { socketId } = job.data

      const sendThinking = (agent: string, message: string) => {
        if (socketId) {
          io.to(socketId).emit('agent:thinking', {
            agent: agent as never,
            message,
            elapsedMs: Date.now() - job.timestamp,
          })
        }
      }

      const sendError = (message: string, retryable = true) => {
        if (socketId) {
          io.to(socketId).emit('agent:error', { jobId: job.id!, message, retryable })
        }
      }

      try {
        if (job.name === 'agent-request') {
          sendThinking('OrchestratorAgent', 'Understanding your request...')

          const response = await axios.post(
            `${ORCH_URL}/agent/request`,
            job.data,
            { timeout: 60_000 },
          )

          const proposals = response.data.proposals ?? []
          for (const proposal of proposals) {
            if (socketId) {
              io.to(socketId).emit('agent:proposal', proposal)
            }
          }

          // Emit socratic question if generated
          if (response.data.socratic_question && socketId) {
            io.to(socketId).emit('socratic:question', response.data.socratic_question)
          }
        } else if (job.name === 'node-conversation') {
          sendThinking('NodeConversationAgent', 'Thinking about this node...')

          const response = await axios.post(
            `${ORCH_URL}/agent/conversation`,
            job.data,
            { timeout: 30_000 },
          )

          if (socketId) {
            io.to(socketId).emit('conversation:reply', response.data)
          }
        } else if (job.name === 'socratic-answer') {
          sendThinking('OrchestratorAgent', 'Expanding map based on your answer...')

          const response = await axios.post(
            `${ORCH_URL}/agent/socratic-answer`,
            job.data,
            { timeout: 30_000 },
          )

          const proposals = response.data.proposals ?? []
          for (const proposal of proposals) {
            if (socketId) io.to(socketId).emit('agent:proposal', proposal)
          }
        }
      } catch (err: unknown) {
        const isTimeout = axios.isAxiosError(err) && err.code === 'ECONNABORTED'
        const message = isTimeout
          ? 'AI is taking longer than expected. Please try again.'
          : 'AI suggestions are temporarily unavailable. Your map is safe.'
        sendError(message, true)
        throw err // BullMQ will retry
      }
    },
    {
      connection,
      concurrency: 10,
      limiter: { max: 50, duration: 10_000 },
    },
  )

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message)
  })

  return worker
}
