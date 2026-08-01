import type { NextFunction, Request, Response } from 'express'

import NotificationDTO from '@/notification/dto/Notification'
import NotificationSocket from '@/notification/notification.socket'
import NotificationService from '@/notification/services/notification.service'
import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import ProfileServiceException from '../errors/ProfileServiceException'
import UserServiceException from '../errors/UserServiceException'
import ProfileService from '../services/profile.service'
import UserService from '../services/user.service'

interface Params {
   username: string
}

export default class FollowUserController {
   private req: Request<Params>
   private res: Response
   private next: NextFunction
   private readonly userService = new UserService()
   private readonly profileService = new ProfileService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as unknown as Request<Params>
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      const { username } = this.req.params

      if (!this.req.session) return this.next(new Error('Authenticated session not found'))

      let targetUser: Awaited<ReturnType<UserService['findUser']>>

      try {
         targetUser = await this.userService.findUser({ username })
      } catch (error) {
         if (error instanceof UserServiceException && error.name === 'user_not_found') {
            const exception = ExceptionFactory.notFound('User not found')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      try {
         await this.profileService.syncUserRelationship(this.req.session.user_uuid, targetUser.uuid, 'FOLLOW')
      } catch (error) {
         if (error instanceof ProfileServiceException && error.name === 'validation_error') {
            const exception = ExceptionFactory.invalidParam(error.message)
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      try {
         const notificationService = new NotificationService()

         const notification = await notificationService.createNotification({
            user_uuid: targetUser.uuid,
            type: 'follow',
            reference_uuid: this.req.session.user_uuid,
            message: `${this.req.session.user_uuid} started following you`
         })

         const dto = new NotificationDTO(notification)

         NotificationSocket.emitToUser(targetUser.uuid, 'receive', dto)
      } catch (error: unknown) {
         console.error('Failed to create follow notification:', error)
      }

      return this.res.status(200).json()
   }
}
