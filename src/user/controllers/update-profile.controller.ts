import type { NextFunction, Request, Response } from 'express'

import ServiceError, { ServiceErrorName } from '@/shared/errors/ServiceError'
import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import ImageService from '../../images/image.service'
import UserService, { type User } from '../services/user.service'

interface QueryRequest extends Request {
   files: {
      avatar?: Express.Multer.File[]
      header?: Express.Multer.File[]
   } & Request['files']
   body: {
      username?: string
      name?: string
      description?: string
      delete_avatar?: 'true' | 'false'
      delete_header?: 'true' | 'false'
   }
}

interface UserImages {
   avatar: {
      id: string
      file: File | null
      updated: boolean,
      new?: {
         id: string
         file: File
         isEmpty: boolean
      }
   },
   header: {
      id: string
      file: File | null
      updated: boolean,
      new?: {
         id: string
         file: Express.Multer.File | File
         isEmpty: boolean
      }
   }
}

interface ExpressFilesObject {
   avatar?: Express.Multer.File[]
   header?: Express.Multer.File[]
}

export default class UpdateProfileController {
   private req: QueryRequest
   private res: Response
   private next: NextFunction
   private readonly userService = new UserService()
   private readonly imageService = new ImageService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as QueryRequest
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      const body = this.req.body
      const files = this.req.files as ExpressFilesObject
      let user: User

      if (!this.req.headers['content-type']?.includes('multipart/form-data')) {
         const exception = ExceptionFactory.contentTypeNotSupport('expected multipart/form-data')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if(!this.req.session) return this.next(new Error('Session not found'))
      const currentUserId = this.req.session.user_id

      try {
         user = await this.userService.findUser({ _id: currentUserId })
         if (!user) return this.next(new Error('User not found'))
      } catch (error) {
         return this.next(error)
      }

      const images: UserImages = {
         avatar: {
            id: user.avatar,
            file: null,
            updated: !!files.avatar,
         },
         header: {
            id: user.header,
            file: null,
            updated: !!files.header,
         }
      }

      if (body.delete_avatar === 'true' && files.avatar?.[0]) {
         const exception = ExceptionFactory.invalidInput('You cannot delete the avatar if you are uploading a new one')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (body.delete_header === 'false' && files.header?.[0]) {
         const exception = ExceptionFactory.invalidInput('You cannot delete the header if you are uploading a new one')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (body.delete_avatar === 'true') {
         images.avatar.updated = true
         images.avatar.new = { id: '', file: null, isEmpty: true }
      }

      if (body.delete_header === 'true') {
         images.header.updated = true
         images.header.new = { id: '', file: null, isEmpty: true }
      }

      if (files.avatar?.[0] && (body.delete_avatar === 'false' || !body.delete_avatar)) {
         try {
            const savedAvatar = await this.imageService.saveImage(files.avatar[0])
            images.avatar.file = await this.imageService.findImage(images.avatar.id)
            images.avatar.updated = true
            images.avatar.new = { file: savedAvatar, id: savedAvatar.name.split('.')[0], isEmpty: false }

            await this.imageService.deleteImage(images.avatar.id)
         } catch (error) {
            return await this.revokeChanges(user._id, images)
               .catch((error) => this.next(error))
               .then(() => this.next(error))
         }
      }

      if (files.header?.[0] && (body.delete_header === 'false' || !body.delete_header)) {
         try {
            const savedHeader = await this.imageService.saveImage(files.header[0])
            images.header.updated = true
            images.header.new = { file: savedHeader, id: savedHeader.name.split('.')[0], isEmpty: false }
         } catch (error) {
            return await this.revokeChanges(user._id, images)
               .catch((error) => this.next(error))
               .then(() => this.next(error))
         }
      }

      if (body.username) {
         try {
            const user = await this.userService.findUser({ username: body.username })

            if (user) {
               const exception = ExceptionFactory.invalidInput('Username already taken')

               return await this.revokeChanges(user._id, images)
                  .catch((error) => this.next(error))
                  .then(() => this.res.status(exception.status).json(exception.toJSON()))
            }
         } catch (error) {
            await this.revokeChanges(user._id, images)
            return this.next(error)
         }
      }

      try {
         const newUser: Parameters<UserService['updateUser']>[1] = {}

         if (images.avatar.updated) newUser.avatar = images.avatar.new.id
         if (images.header.updated) newUser.header = images.header.new.id
         if (body.username !== undefined) newUser.username = body.username
         if (body.name !== undefined) newUser.name = body.name
         if (body.description !== undefined) newUser.description = body.description

         await this.userService.updateUser(user._id.toString(), newUser)
      } catch (error) {
         if (error instanceof ServiceError && error.name === ServiceErrorName.InvalidInput) {
            const exception = ExceptionFactory.invalidInput(error.message)

            return await this.revokeChanges(user._id, images)
               .catch((error) => this.next(error))
               .then(() => this.res.status(exception.status).json(exception.toJSON()))
         }

         return await this.revokeChanges(user._id, images)
            .catch((error) => this.next(error))
            .then(() => this.next(error))
      }

      return this.res.status(200).json()
   }

   private async revokeChanges(userId: User['_id'], images: UserImages) {
      const newUser: Parameters<UserService['updateUser']>[1] = {}

      if (images.avatar.updated) {
         if (images.avatar.new?.file) await this.imageService.deleteImage(images.avatar.new.id)

         if (images.avatar.file) {
            const oldAvatar = await this.imageService.saveImage(images.avatar.file)
            newUser.avatar = oldAvatar.name.split('.')[0]
         }
      }

      if (images.header.updated) {
         if (images.header.new?.file) await this.imageService.deleteImage(images.header.new.id)

         if (images.header.file) {
            const oldHeader = await this.imageService.saveImage(images.header.file)
            newUser.header = oldHeader.name.split('.')[0]
         }
      }

      if (Object.keys(newUser).length > 0) await this.userService.updateUser(userId.toString(), newUser)
   }
}
