import fp from 'fastify-plugin'
import { Queue } from 'bullmq'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    queues: {
      agentTasks: Queue
      exportJobs: Queue
      feedbackBatch: Queue
    }
  }
}

export const bullPlugin = fp(async (app: FastifyInstance) => {
  const connection = { host: process.env.REDIS_HOST ?? 'localhost', port: Number(process.env.REDIS_PORT ?? 6379) }

  const agentTasks = new Queue('agent-tasks', { connection })
  const exportJobs = new Queue('export-jobs', { connection })
  const feedbackBatch = new Queue('feedback-batch', { connection })

  app.decorate('queues', { agentTasks, exportJobs, feedbackBatch })

  app.addHook('onClose', async () => {
    await agentTasks.close()
    await exportJobs.close()
    await feedbackBatch.close()
  })
})
