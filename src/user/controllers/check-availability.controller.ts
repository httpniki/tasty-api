import type { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'

import { ExceptionFactory } from '../../shared/response/http/ExceptionFactory'
import UserModel from '../models/user.model.js'
import UserService from '../services/user.service'

interface DataDTO {
   field?: 'username' | 'email'
   value: string
}

class ResponseDTO {
   isAvailable: boolean
   message: string
   data: DataDTO

   constructor({ isAvailable, message, data }: { isAvailable: boolean, message: string, data: DataDTO }) {
      this.isAvailable = isAvailable
      this.message = message
      this.data = data
   }

   public toJSON() {
      return  {
         isAvailable: this.isAvailable,
         message: this.message,
         data: this.data
      }
   }
}

export default class CheckAvailabilityController {
   private readonly req: Request<ParamsDictionary, any, DataDTO, any>
   private readonly res: Response
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

      if (this.req.headers['content-type'] !== 'application/json') {
         const exception = ExceptionFactory.contentTypeNotSupport('expected application/json')
         return this.next(exception)
      }

      if (!field || !value) return this.next(ExceptionFactory.invalidInput('field and value are required'))
      if (!['username', 'email'].includes(field)) return this.next(ExceptionFactory.invalidInput('field must be username or email'))

      if (field === 'email' && value.length > UserModel.schema['tree'].email.maxlength[0]) {
         const response = new ResponseDTO({
            isAvailable: false,
            message: 'Email is too long',
            data: { field, value }
         })
         return this.res.status(200).json(response.toJSON())
      }

      if (field === 'email' && !UserModel.schema['tree'].email.match[0].test(value)) {
         const response = new ResponseDTO({
            isAvailable: false,
            message: 'Invalid email format',
            data: { field, value }
         })
         return this.res.status(200).json(response.toJSON())
      }

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

      const response = new ResponseDTO({
         isAvailable,
         message: capitalized + (isAvailable ? ' is available' : ' is already taken'),
         data: { field, value }
      })
      return this.res.status(200).json(response.toJSON())
   }
}
