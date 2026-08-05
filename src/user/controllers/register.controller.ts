import type { NextFunction, Request, Response } from 'express'

import ImageService from '@/images/image.service'
import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import ProfileServiceException from '../errors/ProfileServiceException'
import UserServiceException from '../errors/UserServiceException'
import ProfileService from '../services/profile.service'
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

export default class RegisterController {
   private req: QueryRequest
   private res: Response
   private next: NextFunction
   private userService = new UserService()
   private imageService = new ImageService()
   private profileService = new ProfileService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as QueryRequest
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      const body = this.req.body
      const files = this.req.files
      let user: Awaited<ReturnType<typeof this.userService.createUser>>

      if (!this.req.headers['content-type'].includes('multipart/form-data')) {
         const exception = ExceptionFactory.contentTypeNotSupport('Content-Type must to be multipart/form-data')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      const user_schema: Parameters<UserService['createUser']>[0] = {
         username: body.username,
         email: body.email,
         password: body.password,
      }

      try {
         user = await this.userService.createUser(user_schema)
      } catch (error: any) {
         if (error instanceof UserServiceException) {
            const exception = ExceptionFactory.invalidInput(error.message, error.data)
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      const profile_schema: Parameters<ProfileService['createProfile']>[0] = {
         name: body.name,
         birthday: body.birthday,
         description: body.description,
         user_uuid: user.uuid
      }

      try {
         if (files?.avatar && files.avatar.length > 0) {
            const avatar = files.avatar[0]

            const image = await this.imageService.saveImage(avatar)
            profile_schema.avatar = image.name.split('.')[0]
         }

         if (files?.header && files.header.length > 0) {
            const header = files.header[0]

            const image = await this.imageService.saveImage(header)
            profile_schema.header = image.name.split('.')[0]
         }
      } catch (error) {
         this.revokeChanges(profile_schema)
         return this.next(error)
      }

      try {
         await this.profileService.createProfile(profile_schema)
      } catch (error: any) {
         this.revokeChanges(profile_schema)

         if (error instanceof ProfileServiceException) {
            const exception = ExceptionFactory.invalidInput(error.message, error.data)
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      return this.res.status(201).json()
   }

   private async revokeChanges(schema: Parameters<ProfileService['createProfile']>[0]) {
      try {
         if (schema.avatar) await this.imageService.deleteImage(schema.avatar)
         if (schema.header) await this.imageService.deleteImage(schema.header)
      } catch (error) {
         return this.next(error)
      }
   }
}
