import { ReferralMailer } from '@latitude-data/mailers'

import { SendReferralInvitationEvent } from '.'
import { unsafelyFindUserByEmail, unsafelyGetUser } from '../../data-access'
import { BadRequestError, NotFoundError } from '../../lib'

export const sendReferralInvitationJob = async ({
  data: event,
}: {
  data: SendReferralInvitationEvent
}) => {
  const invitee = await unsafelyGetUser(event.data.userId)
  if (!invitee) throw new NotFoundError('Invitee user not found')

  const invited = await unsafelyFindUserByEmail(event.data.email)
  if (invited) throw new BadRequestError('User already exists')

  const mailer = new ReferralMailer(
    {
      to: event.data.email,
    },
    {
      email: event.data.email,
      invitee,
    },
  )

  await mailer.send().then((r) => r.unwrap())
}
