import { Error as MongooseError } from 'mongoose'
import { v4 as uuid } from 'uuid'

import { ProfileServiceExceptionFactory } from '../errors/ProfileServiceException'
import ProfileModel, { type IProfile } from '../models/profile.model'

type Profile = Omit<IProfile, '_id'>

interface FindProfileArguments {
   uuid?: string
   user_uuid?: string
}

interface CreateProfileSchema {
   user_uuid: string
   name: string
   birthday: Date
   avatar?: string
   header?: string
}

export default class ProfileService {
   private projection = {
      uuid: true,
      user_uuid: true,
      name: true,
      description: true,
      avatar: true,
      header: true,
      posts: true,
      chats: true,
      follows: true,
      followers: true,
      birthday: true
   }

   async findProfile(args: FindProfileArguments): Promise<Profile> {
      const result = await ProfileModel
         .findOne()
         .where(args)
         .select(this.projection)

      if (!result) throw ProfileServiceExceptionFactory.profileNotFound({ uuid: args.uuid })

      const profile = result.toJSON()

      return {
         name: profile.name,
         uuid: profile.uuid,
         user_uuid: profile.user_uuid,
         avatar: profile.avatar,
         header: profile.header,
         birthday: profile.birthday,
         description: profile.description,
         follows: profile.follows,
         followers: profile.followers,
         posts: profile.posts,
         chats: profile.chats as Profile['chats'],
      }
   }

   async createProfile(args: CreateProfileSchema): Promise<Profile> {
      const profile_uuid = uuid()

      const profileModel = new ProfileModel({
         uuid: profile_uuid,
         user_uuid: args.user_uuid,
         name: args.name,
         birthday: args.birthday
      })

      const error = await profileModel
         .validate()
         .catch((err: MongooseError.ValidationError) => Object.values(err.errors)[0])

      if (error && error instanceof MongooseError.ValidatorError) throw ProfileServiceExceptionFactory.validationError(error.message, { [error.path]: error.message })
      if (error && error instanceof MongooseError.CastError) throw error

      return await profileModel
         .save()
         .then((p) => {
            const profile = p.toObject()

            return {
               uuid: profile.uuid,
               user_uuid: profile.user_uuid,
               name: profile.name,
               description: profile.description,
               avatar: profile.avatar,
               header: profile.header,
               posts: profile.posts,
               chats: profile.chats as Profile['chats'],
               follows: profile.follows,
               followers: profile.followers,
               birthday: profile.birthday,
            }
         })
         .catch((err) => { throw err })
   }

   async updateProfile(user_uuid: string, data: Partial<Omit<IProfile, 'uuid' | 'user_uuid' | '_id'>>): Promise<Profile> {
      const result = await ProfileModel.findOne({ user_uuid })

      if (!result) throw ProfileServiceExceptionFactory.profileNotFound({ user_uuid })

      return await ProfileModel
         .findOneAndUpdate({ runValidators: true })
         .where({ user_uuid })
         .set(data)
         .then((u) => {
            const user = u.toObject()
            return {
               uuid: user.uuid,
               user_uuid: user.user_uuid,
               name: user.name,
               description: user.description,
               avatar: user.avatar,
               header: user.header,
               posts: user.posts,
               chats: user.chats as Profile['chats'],
               follows: user.follows,
               followers: user.followers,
               birthday: user.birthday
            }
         })
         .catch((err) => {
            if (err instanceof MongooseError.ValidatorError) {
               throw ProfileServiceExceptionFactory.validationError(err.message, { [err.path]: err.message })
            }

            throw err
         })
   }

   async syncUserRelationship(user_uuid: string, target_uuid: string, relationship: 'FOLLOW' | 'UNFOLLOW') {
      const user_profile = await ProfileModel.findOne({ user_uuid })
      const target_profile = await ProfileModel.findOne({ user_uuid: target_uuid })

      if (!user_profile) throw ProfileServiceExceptionFactory.profileNotFound({ user_uuid })
      if (!target_profile) throw ProfileServiceExceptionFactory.profileNotFound({ target_uuid })

      if (relationship === 'UNFOLLOW' && user_uuid === target_uuid) {
         throw ProfileServiceExceptionFactory.validationError('You cannot unfollow yourself', { user_uuid, target_uuid })
      }

      if (relationship === 'UNFOLLOW' && !user_profile.follows.includes(target_uuid)) {
         throw ProfileServiceExceptionFactory.validationError('User already unfollowed', { user_uuid, target_uuid })
      }

      if (relationship === 'UNFOLLOW' && user_profile.follows.includes(target_uuid)) {
         user_profile.follows = user_profile.follows.filter((el) => el !== target_uuid)
         target_profile.followers = target_profile.followers.filter((el) => el !== user_uuid)
      }

      if (relationship === 'FOLLOW' && user_uuid === target_uuid) {
         throw ProfileServiceExceptionFactory.validationError('You cannot follow yourself', { user_uuid, target_uuid })
      }

      if (relationship === 'FOLLOW' && user_profile.follows.includes(target_uuid)) {
         throw ProfileServiceExceptionFactory.validationError('User already followed', { user_uuid, target_uuid })
      }

      if (relationship === 'FOLLOW' && !user_profile.follows.includes(target_uuid)) {
         user_profile.follows.push(target_uuid)
         target_profile.followers.push(user_uuid)
      }

      await ProfileModel.findOneAndUpdate({ user_uuid: user_uuid }, { follows: user_profile.follows })
      await ProfileModel.findOneAndUpdate({ user_uuid: target_uuid }, { followers: target_profile.followers })
   }
}
