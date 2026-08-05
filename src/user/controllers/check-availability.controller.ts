import type { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import UserServiceException from '../errors/UserServiceException'
import UserModel from '../models/user.model'
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
      return {
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
      if (!this.req.is('application/json')) {
         const exception = ExceptionFactory.contentTypeNotSupport('expected application/json')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      const { field, value } = (this.req.body || {}) as DataDTO

      if (!field || !value) {
         const exception = ExceptionFactory.invalidInput('field and value are required')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (!['username', 'email'].includes(field)) {
         const exception = ExceptionFactory.invalidInput('field must be username or email')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (field === 'username' && value.length < UserModel.schema['tree'].username.minlength[0]) {
         const response = new ResponseDTO({
            isAvailable: false,
            message: 'Username is too short',
            data: { field, value }
         })
         return this.res.status(200).json(response.toJSON())
      }

      if (field === 'username' && value.length > UserModel.schema['tree'].username.maxlength[0]) {
         const response = new ResponseDTO({
            isAvailable: false,
            message: 'Username is too long',
            data: { field, value }
         })
         return this.res.status(200).json(response.toJSON())
      }

      if (field === 'username' && !UserModel.schema['tree'].username.match[0].test(value)) {
         const response = new ResponseDTO({
            isAvailable: false,
            message: 'Invalid username format',
            data: { field, value }
         })
         return this.res.status(200).json(response.toJSON())
      }

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

      let isAvailable = true

      try {
         if (field === 'username') {
            await this.userService.findUser({ username: value })
            isAvailable = false
         }

         if (field === 'email') {
            await this.userService.findUser({ email: value })
            isAvailable = false
         }
      } catch (error) {
         if (error instanceof UserServiceException && error.name === 'user_not_found') {
            isAvailable = true
         } else {
            return this.next(error)
         }
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
