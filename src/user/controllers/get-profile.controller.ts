import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import Profile from '../dto/profile'
import UserModel from '../models/user.model'
import UserService, { type User } from '../services/user.service'

export default class GetProfileController {
   private req: Request<{ username: string }>
   private res: Response
   private next: NextFunction
   private readonly userService = new UserService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as Request<{ username: string }>
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      const { username } = this.req.params
      let user: User | null = null
      let currentUser: User | null = null

      if (!username) {
         const exception = ExceptionFactory.invalidParam('Username is not provided')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      const usernameModelPath = UserModel.schema.path('username')
      const regexpValidator = usernameModelPath.validators.find((el) => el.type === 'regexp')
      const message = regexpValidator.message

      if (!regexpValidator) return this.next(new Error('Regex validator not found'))

      const isValid = regexpValidator.validator(username)

      if (!isValid) {
         const exception = ExceptionFactory.invalidParam(message)
         return this.res.status(exception.status).json(exception.toJSON())
      }

      try {
         if (this.req.session) {
            currentUser = await this.userService.findUser({ _id: this.req.session.user_id })
         }

         user = await this.userService.findUser({ username })
      } catch (error) {
         return this.next(error)
      }

      if (!user) {
         const exception = ExceptionFactory.notFound('User not found')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      const dto = new Profile({
         uuid: user.uuid,
         name: user.name,
         username: user.username,
         description: user.description,
         email: user.email,
         avatar: user.avatar,
         header: user.header,
         birthday: user.birthday,
         follows: user.follows.length,
         followers: user.followers.length,
         posts: user.posts.map((post) => ({ type: 'post', uuid: post.uuid })),
         followed: !!currentUser?.follows.includes(user.uuid),
         follower: !!currentUser?.followers.includes(user.uuid),
         current_user: user.uuid === currentUser?.uuid
      })

      return this.res.status(200).json(dto)
   }
}
