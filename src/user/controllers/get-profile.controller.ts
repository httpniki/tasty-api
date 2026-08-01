import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import Profile from '../dto/profile'
import UserServiceException from '../errors/UserServiceException'
import ProfileService from '../services/profile.service'
import UserService from '../services/user.service'

type User = Awaited<ReturnType<UserService['findUser']>>

export default class GetProfileController {
   private req: Request<{ username: string }>
   private res: Response
   private next: NextFunction
   private readonly userService = new UserService()
   private readonly profileService = new ProfileService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as Request<{ username: string }>
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      const { username } = this.req.params

      if (!username) {
         const exception = ExceptionFactory.invalidParam('Username is not provided')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      let currentProfile: Awaited<ReturnType<ProfileService['findProfile']>> | null = null

      try {
         if (this.req.session) {
            currentProfile = await this.profileService.findProfile({ user_uuid: this.req.session.user_uuid })
         }
      } catch (error) {
         return this.next(error)
      }

      let user: User
      let profile: Awaited<ReturnType<ProfileService['findProfile']>>

      try {
         user = await this.userService.findUser({ username })
         profile = await this.profileService.findProfile({ user_uuid: user.uuid })
      } catch (error) {
         if (error instanceof UserServiceException && error.name === 'user_not_found') {
            const exception = ExceptionFactory.notFound('User not found')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      const dto = new Profile({
         uuid: user.uuid,
         name: profile.name,
         username: user.username,
         description: profile.description,
         email: user.email,
         avatar: profile.avatar,
         header: profile.header,
         birthday: profile.birthday.toString(),
         follows: profile.follows.length,
         followers: profile.followers.length,
         posts: profile.posts.map((el) => ({
            type: el.type,
            created_at: el.created_at?.toString(),
            reposted_at: el.reposted_at?.toString(),
            uuid: el.uuid
         })),
         followed: !!currentProfile?.follows.includes(user.uuid),
         follower: !!currentProfile?.followers.includes(user.uuid),
         current_user: user.uuid === currentProfile?.user_uuid
      })

      return this.res.status(200).json(dto)
   }
}
