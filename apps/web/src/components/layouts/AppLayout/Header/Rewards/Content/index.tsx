'use client'

import { useState } from 'react'

import { RewardType } from '@latitude-data/core/browser'
import { Text } from '@latitude-data/web-ui'

import { RewardItem } from './RewardItem'
import { RewardMenu } from './RewardMenu'

export function RewardsContent() {
  const [selectedType, setSelectedType] = useState<RewardType>()

  if (selectedType) {
    return (
      <RewardMenu
        type={selectedType}
        onClose={() => setSelectedType(undefined)}
      />
    )
  }

  return (
    <div className='flex flex-col p-4 gap-2'>
      <Text.H5>
        Get rewards and extend your runs limit forever by completing these
        actions
      </Text.H5>
      <RewardItem
        description='Give us a Github star'
        type={RewardType.GithubStar}
        onClick={() => setSelectedType(RewardType.GithubStar)}
      />
      <RewardItem
        description='Follow us on X or LinkedIn'
        type={RewardType.Follow}
        onClick={() => setSelectedType(RewardType.Follow)}
      />
      <RewardItem
        description='Post on X or LinkedIn'
        type={RewardType.Post}
        onClick={() => setSelectedType(RewardType.Post)}
      />
      <RewardItem
        description='Refer Latitude to a friend'
        type={RewardType.Referral}
        onClick={() => setSelectedType(RewardType.Referral)}
      />
      <RewardItem
        description='Resolve an Issue on Github'
        type={RewardType.GithubIssue}
        onClick={() => setSelectedType(RewardType.GithubIssue)}
      />
    </div>
  )
}
