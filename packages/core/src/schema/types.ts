import { type InferSelectModel } from 'drizzle-orm'

import { EvaluationResultableType } from '../constants'
import { apiKeys } from './models/apiKeys'
import { claimedRewards } from './models/claimedRewards'
import { commits } from './models/commits'
import { connectedEvaluations } from './models/connectedEvaluations'
import { datasets } from './models/datasets'
import { documentLogs } from './models/documentLogs'
import { documentVersions } from './models/documentVersions'
import { evaluationResults } from './models/evaluationResults'
import { evaluations } from './models/evaluations'
import { evaluationTemplateCategories } from './models/evaluationTemplateCategories'
import { evaluationTemplates } from './models/evaluationTemplates'
import { llmAsJudgeEvaluationMetadatas } from './models/llmAsJudgeEvaluationMetadatas'
import { magicLinkTokens } from './models/magicLinkTokens'
import { memberships } from './models/memberships'
import { projects } from './models/projects'
import { providerApiKeys } from './models/providerApiKeys'
import { providerLogs } from './models/providerLogs'
import { runErrors } from './models/runErrors'
import { sessions } from './models/sessions'
import { users } from './models/users'
import { workspaces } from './models/workspaces'

// Model types are out of schema files to be able to share with NextJS webpack bundler
// otherwise, it will throw an error.
export type Workspace = InferSelectModel<typeof workspaces>
export type User = InferSelectModel<typeof users>
export type Session = InferSelectModel<typeof sessions> & {
  user: User
}
export type Membership = InferSelectModel<typeof memberships>
export type ProviderApiKey = InferSelectModel<typeof providerApiKeys>
export type ApiKey = InferSelectModel<typeof apiKeys>
export type Commit = InferSelectModel<typeof commits>
export type DocumentVersion = InferSelectModel<typeof documentVersions>
export type Project = InferSelectModel<typeof projects>
export type ProviderLog = InferSelectModel<typeof providerLogs>
export type DocumentLog = InferSelectModel<typeof documentLogs>
export type RunError = InferSelectModel<typeof runErrors>
export type Evaluation = InferSelectModel<typeof evaluations>
export type ConnectedEvaluation = InferSelectModel<typeof connectedEvaluations>
export type EvaluationResult = InferSelectModel<typeof evaluationResults>
export type EvaluationTemplate = InferSelectModel<typeof evaluationTemplates>
export type MagicLinkToken = InferSelectModel<typeof magicLinkTokens>
export type ClaimedReward = InferSelectModel<typeof claimedRewards>
export type EvaluationTemplateCategory = InferSelectModel<
  typeof evaluationTemplateCategories
>
export type LlmAsJudgeEvaluationMetadata = InferSelectModel<
  typeof llmAsJudgeEvaluationMetadatas
>

export type EvaluationDto = Evaluation & {
  metadata: Omit<
    LlmAsJudgeEvaluationMetadata,
    'metadataType' | 'createdAt' | 'updatedAt'
  >
}

export type Dataset = InferSelectModel<typeof datasets> & {
  author: Pick<User, 'id' | 'name'> | undefined
}

type EvaluationResultNumberConfiguration = {
  range: { from: number; to: number }
}

export type EvaluationResultConfiguration = {
  type: EvaluationResultableType
  detail?: EvaluationResultNumberConfiguration
}

export type EvaluationTemplateWithCategory = EvaluationTemplate & {
  category: string
}

export type ProviderLogDto = Omit<
  ProviderLog,
  'responseText' | 'responseObject'
> & { response: string }

export type ClaimedRewardWithUserInfo = ClaimedReward & {
  workspaceName: string | null
  userName: string | null
  userEmail: string | null
}
