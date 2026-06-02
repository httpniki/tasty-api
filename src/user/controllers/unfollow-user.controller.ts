import type { NextFunction, Request, Response } from 'express'

import { ServiceErrorName } from '@/shared/errors/ServiceError'
import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import UserModel from '../models/user.model'
import UserService from '../services/user.service'

interface Params {
   username: string
}

export default class UnfollowUserController {
   private req: Request<Params>
   private res: Response
   private next: NextFunction
   private readonly userService = new UserService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as unknown as Request<Params>
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      const { username } = this.req.params
      let targetId: string | null = null

      const result = this.validateUsername(username)
      if (!result.isValid && result.error) return this.next(result.error)

      if (!result.isValid && !result.error) {
         const exception = ExceptionFactory.invalidParam(result.message)
         return this.res.status(exception.status).json(exception.toJSON())
      }

      try {
         const targetUser = await this.userService.findUser({ username: { $regex: new RegExp(`${username}`, 'i') } })

         if (!targetUser) {
            const exception = ExceptionFactory.notFound('User not found')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         targetId = targetUser._id.toString()
      } catch (error) {
         return this.next(error)
      }

      if (!this.req.session) return this.next(new Error('Session not found'))
      const currentId = this.req.session.user_id

      if (currentId === targetId) {
         const exception = ExceptionFactory.invalidParam('You cannot unfollow yourself')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      try {
         await this.userService.syncUserRelationship(currentId, targetId, 'UNFOLLOW')
      } catch (error) {
         if (error.name === ServiceErrorName.InvalidInput) {
            const exception = ExceptionFactory.invalidParam('User already unfollowed')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      return this.res.status(200).json()
   }

   private validateUsername(username?: string) {
      const result = { isValid: true, message: '', error: null as Error | null }

      if (!username) {
         result.message = 'Username is not provided'
         result.isValid = false
      }

      const regexpValidator = UserModel.schema.path('username').validators.find((el) => el.type === 'regexp')

      if (!regexpValidator) {
         result.message = 'Regex validator not found'
         result.isValid = false
         result.error = new Error('Regex validator not found')
      }

      const message = regexpValidator.message
      const isValid = regexpValidator.validator(username)

      if (!isValid) {
         result.message = message
         result.isValid = false
      }

      return result
   }
}
