import type { FastifyInstance } from 'fastify'

export async function exportRoute(app: FastifyInstance) {
  // Queue export job
  app.post<{ Params: { mapId: string } }>('/:mapId', async (req, reply) => {
    const { mapId } = req.params
    const { format = 'png' } = req.body as { format?: 'png' | 'svg' | 'pdf' | 'json' | 'markdown' }

    const job = await app.queues.exportJobs.add('export', {
      mapId,
      format,
      userId: 'dev-user',
    })

    return reply.status(202).send({ jobId: job.id })
  })

  // Get export status
  app.get<{ Params: { jobId: string } }>('/:jobId/status', async (req, reply) => {
    const { jobId } = req.params
    const job = await app.queues.exportJobs.getJob(jobId)
    if (!job) return reply.status(404).send({ message: 'Job not found' })

    const state = await job.getState()
    return { jobId, state, result: job.returnvalue }
  })
}
