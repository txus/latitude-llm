import { setupJobs } from '@latitude-data/jobs'

import {
  AIProviderCallCompletedData,
  StreamType,
} from '../../../events/handlers'
import { publisher } from '../../../events/publisher'
import { createProviderLog } from '../../providerLogs'
import { type ObjectProviderLogsData } from './processStreamObject'
import { type TextProviderLogsData } from './processStreamText'

export type LogData<T extends StreamType> = T extends 'text'
  ? Awaited<TextProviderLogsData>
  : T extends 'object'
    ? Awaited<ObjectProviderLogsData>
    : never

export async function saveOrPublishProviderLogs<T extends StreamType>({
  data,
  streamType,
  saveSyncProviderLogs,
}: {
  streamType: T
  data: LogData<T>
  saveSyncProviderLogs: boolean
}) {
  publisher.publishLater({
    type: 'aiProviderCallCompleted',
    data: { ...data, streamType } as AIProviderCallCompletedData<T>,
  })

  if (saveSyncProviderLogs) {
    const providerLog = await createProviderLog(data).then((r) => r.unwrap())
    return providerLog
  }

  const queues = await setupJobs()

  // FIXME: JOBS are not typed at all inference is not working at all
  // Review this because we can introduce bugs here
  queues.defaultQueue.jobs.enqueueCreateProviderLogJob(data)
}
