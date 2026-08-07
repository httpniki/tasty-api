import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import ImageService from '../../images/image.service'
import ProfileServiceException from '../errors/ProfileServiceException'
import ProfileService from '../services/profile.service'
import UserService from '../services/user.service'

interface QueryRequest extends Request {
   files: {
      avatar?: Express.Multer.File[]
      header?: Express.Multer.File[]
   } & Request['files']
   body: {
      name?: string
      description?: string
      delete_avatar?: 'true' | 'false'
      delete_header?: 'true' | 'false'
      birthday?: string
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
   private readonly profileService = new ProfileService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as QueryRequest
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      const body = this.req.body
      const files = this.req.files as ExpressFilesObject
      let user: Awaited<ReturnType<UserService['findUser']>>
      let profile: Awaited<ReturnType<ProfileService['findProfile']>>

      if (!this.req.headers['content-type']?.includes('multipart/form-data')) {
         const exception = ExceptionFactory.contentTypeNotSupport('expected multipart/form-data')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (!this.req.session) return this.next(new Error('Authenticated session not found'))
      const user_uuid = this.req.session.user_uuid

      try {
         user = await this.userService.findUser({ uuid: user_uuid })
         profile = await this.profileService.findProfile({ user_uuid: user.uuid })
      } catch (error) {
         return this.next(error)
      }

      const images: UserImages = {
         avatar: {
            id: profile.avatar,
            file: null,
            updated: !!files.avatar,
         },
         header: {
            id: profile.header,
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
         } catch (error: unknown) {
            return await this.revokeChanges(user.uuid, images)
               .catch((error) => this.next(error))
               .then(() => this.next(error))
         }
      }

      if (files.header?.[0] && (body.delete_header === 'false' || !body.delete_header)) {
         try {
            const savedHeader = await this.imageService.saveImage(files.header[0])
            images.header.updated = true
            images.header.new = { file: savedHeader, id: savedHeader.name.split('.')[0], isEmpty: false }
         } catch (error: unknown) {
            return await this.revokeChanges(user.uuid, images)
               .catch((error) => this.next(error))
               .then(() => this.next(error))
         }
      }

      try {
         const newUser: Parameters<ProfileService['updateProfile']>[1] = {}

         if (images.avatar.updated) newUser.avatar = images.avatar.new.id
         if (images.header.updated) newUser.header = images.header.new.id
         if (body.name !== undefined) newUser.name = body.name
         if (body.description !== undefined) newUser.description = body.description
         if (body.birthday !== undefined) newUser.birthday = body.birthday

         await this.profileService.updateProfile(user.uuid, newUser)
      } catch (error) {
         if (error instanceof ProfileServiceException && error.name === 'validation_error') {
            const exception = ExceptionFactory.invalidInput(error.message, error.data)

            return await this.revokeChanges(user.uuid, images)
               .catch((error) => this.next(error))
               .then(() => this.res.status(exception.status).json(exception.toJSON()))
         }

         return await this.revokeChanges(user.uuid, images)
            .catch((error) => this.next(error))
            .then(() => this.next(error))
      }

      return this.res.status(200).json()
   }

   private async revokeChanges(user_uuid: string, images: UserImages) {
      const newProfile: Parameters<ProfileService['updateProfile']>[1] = {}

      if (images.avatar.updated) {
         if (images.avatar.new?.file) await this.imageService.deleteImage(images.avatar.new.id)

         if (images.avatar.file) {
            const oldAvatar = await this.imageService.saveImage(images.avatar.file)
            newProfile.avatar = oldAvatar.name.split('.')[0]
         }
      }

      if (images.header.updated) {
         if (images.header.new?.file) await this.imageService.deleteImage(images.header.new.id)

         if (images.header.file) {
            const oldHeader = await this.imageService.saveImage(images.header.file)
            newProfile.header = oldHeader.name.split('.')[0]
         }
      }

      if (Object.keys(newProfile).length > 0) await this.profileService.updateProfile(user_uuid, newProfile)
   }
}
