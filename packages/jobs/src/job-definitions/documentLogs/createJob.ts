import { createDocumentLog, CreateDocumentLogProps } from '@latitude-data/core'
import { Job } from 'bullmq'

export type CreateDocumentLogJobData = CreateDocumentLogProps

export const createDocumentLogJob = async (
  job: Job<CreateDocumentLogJobData>,
) => {
  await createDocumentLog(job.data).then((r) => r.unwrap())
}