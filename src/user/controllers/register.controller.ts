import type { NextFunction, Request, Response } from 'express'

import ServiceError, { ServiceErrorName } from '@/shared/errors/ServiceError'
import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import AuthService from '../../auth/services/auth.service'
import ImageService from '../../images/image.service'
import UserService from '../services/user.service'

interface QueryRequest extends Request {
   files: {
      avatar?: File[]
      header?: File[]
   } & Request['files']
   body: {
      username?: string
      description?: string
      email?: string
      password?: string
      name?: string
      birthday?: string
   }
}

type UserSchema = Parameters<UserService['createUser']>[0]

export default class RegisterController {
   private req: QueryRequest
   private res: Response
   private next: NextFunction
   private imageService = new ImageService()
   private authService = new AuthService()
   private userService = new UserService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as QueryRequest
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      if (!this.req.headers['content-type'].includes('multipart/form-data')) {
         const exception = ExceptionFactory.contentTypeNotSupport('expected multipart/form-data')
         return this.next(exception)
      }

      const body = this.req.body
      const files = this.req.files as { [fieldname: string]: Express.Multer.File[] }

      const encryptedPassword: string | null = await this.authService
         .hashPassword(body.password)
         .then((hash) => hash)
         .catch<null>(() => null)

      const schema: UserSchema = {
         username: body.username,
         email: body.email,
         description: body.description,
         name: body.name,
         password: body.password,
         encrypted_password: encryptedPassword,
         birthday: body.birthday,
      }

      try {
         if (files?.avatar && files.avatar.length > 0) {
            const avatar = files.avatar[0]

            const image = await this.imageService.saveImage(avatar)
            schema.avatar = image.name.split('.')[0]
         }

         if (files?.header && files.header.length > 0) {
            const header = files.header[0]

            const image = await this.imageService.saveImage(header)
            schema.header = image.name.split('.')[0]
         }
      } catch (error) {
         this.revokeChanges(schema)
         this.next(error)
      }

      try {
         await this.userService.createUser(schema)
      } catch (error) {
         this.revokeChanges(schema)
         if (!(error instanceof ServiceError)) return this.next(error)

         if (error.name === ServiceErrorName.InvalidInput) {
            const exception = ExceptionFactory.invalidInput(error.message)
            return this.res.status(exception.status).json(exception.toJSON())
         }
      }

      return this.res.status(201).json()
   }

   private async revokeChanges(schema: UserSchema) {
      try {
         if (schema.avatar) await this.imageService.deleteImage(schema.avatar)
         if (schema.header) await this.imageService.deleteImage(schema.header)
      } catch (err) {
         return this.next(err)
      }
   }
}
