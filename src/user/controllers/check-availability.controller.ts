import type { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'

import { ExceptionFactory } from '../../shared/response/http/ExceptionFactory'
import UserService from '../services/user.service'

interface QueryBody {
   field?: 'username' | 'email'
   value: string
}

interface ResponseBody {
   isAvailable: boolean
   message: string
   data: {
      field: QueryBody['field']
      value: QueryBody['value']
   }
}

export default class CheckAvailabilityController {
   private readonly req: Request<ParamsDictionary, any, QueryBody, any>
   private readonly res: Response<ResponseBody, Record<string, any>>
   private readonly next: NextFunction
   private readonly userService = new UserService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      const { field, value } = this.req.body
      let isAvailable = true

      if(this.req.headers['content-type'] !== 'application/json') {
         const exception = ExceptionFactory.contentTypeNotSupport('expected application/json')
         return this.next(exception)
      }

      if (!field || !value) return this.next(ExceptionFactory.invalidInput('field and value are required'))
      if (!['username', 'email'].includes(field)) return this.next(ExceptionFactory.invalidInput('field must be username or email'))

      try {
         if (field === 'username') {
            const user = await this.userService.findUser({ username: value })
            isAvailable = !user
         }

         if (field === 'email') {
            const user = await this.userService.findUser({ email: value })
            isAvailable = !user
         }
      } catch (error) {
         return this.next(error)
      }

      const capitalized = field.split('').map((char, index) => index === 0 ? char.toUpperCase() : char).join('')

      if (!isAvailable) {
         return this.res.status(200).json({
            isAvailable,
            message: capitalized + ' is already taken',
            data: { field, value }
         })
      }

      return this.res.status(200).json({
         isAvailable,
         message: capitalized + ' is available',
         data: { field, value }
      })
   }
}
