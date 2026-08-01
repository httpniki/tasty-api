import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import CurrentUser, { Profile } from '../dto/current-user.dto'
import UserServiceException from '../errors/UserServiceException'
import ProfileService from '../services/profile.service'
import UserService from '../services/user.service'

export default class GetCurrentUserController {
   private req: Request
   private res: Response
   private next: NextFunction
   private readonly userService = new UserService()
   private readonly profileService = new ProfileService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      if (!this.req.session) return this.next(new Error('Session not found'))

      const { user_uuid } = this.req.session

      let user: Awaited<ReturnType<UserService['findUser']>>
      let profile: Awaited<ReturnType<ProfileService['findProfile']>>

      try {
         user = await this.userService.findUser({ uuid: user_uuid })
         profile = await this.profileService.findProfile({ user_uuid: user.uuid })
      } catch (error) {
         if (error instanceof UserServiceException && error.name === 'user_not_found') {
            const exception = ExceptionFactory.notFound('Existing user not found')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      const dto = new CurrentUser({
         uuid: user.uuid,
         username: user.username,
         email: user.email,
         profile: new Profile({ name: profile.name, avatar: profile.avatar }),
         status: user.status
      })

      return this.res.status(200).json(dto)
   }
}
