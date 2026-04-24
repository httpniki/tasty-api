import { v4 as uuid } from 'uuid'

import ServiceError, { ServiceErrorName } from '@/shared/errors/ServiceError'

import UserModel, { type IUser } from '../models/user.model'

interface NewUserData extends Pick<IUser, 'username' | 'email' | 'name' | 'encrypted_password' | 'birthday' | 'password'> {
   avatar?: IUser['avatar']
   header?: IUser['header']
   description?: IUser['description']
}

export type User = Omit<IUser, 'password'>

interface FindUserArguments {
   email?: string
   username?: string | { $regex: RegExp }
   uuid?: string
   _id?: string
}

type FindUserProjection = { [key in keyof User]: boolean }

interface UsersWithPaging {
   users: User[]
   paging: {
      page: number
      limit: number
      max_page: number
      total_results: number
   }
}

export default class UserService {
   private projection: FindUserProjection = {
      _id: true,
      uuid: true,
      username: true,
      avatar: true,
      header: true,
      name: true,
      email: true,
      posts: true,
      follows: true,
      followers: true,
      created_at: true,
      birthday: true,
      description: true,
      encrypted_password: true
   }

   /**
      @throws ServiceError.DatabaseError
   **/
   async findUser(args: FindUserArguments): Promise<User | null> {
      try {
         const user = await UserModel
            .findOne()
            .where(args)
            .select(this.projection)

         if (user) return user.toObject()

         return null
      } catch (error) {
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }
   }

   async findUsers(query: string, page = 1, limit = 20): Promise<UsersWithPaging> {
      let users: User[] = []
      let totalResults = 0

      try {
         const [results, total] = await Promise.all([
            UserModel
               .find({
                  $or: [
                     { name: { $regex: new RegExp(query, 'i') } },
                     { username: { $regex: new RegExp(query, 'i') } }
                  ]
               })
               .select({
                  _id: true,
                  uuid: true,
                  username: true,
                  avatar: true,
                  name: true
               })
               .skip((page - 1) * limit)
               .limit(limit),
            UserModel.countDocuments({
               $or: [
                  { name: { $regex: new RegExp(query, 'i') } },
                  { username: { $regex: new RegExp(query, 'i') } }
               ]
            })
         ])

         users = results.map((user) => user.toObject())
         totalResults = total
      } catch (error) {
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }

      return {
         users,
         paging: {
            page,
            limit,
            total_results: totalResults,
            max_page: Math.ceil(totalResults / limit)
         }
      }
   }

   /**
      @throws ServiceError.InvalidInput
      @throws ServiceError.DatabaseError
   **/
   async createUser(user: NewUserData) {
      const userModel = new UserModel({
         ...user,
         uuid: uuid(),
         posts: [],
         follows: [],
         followers: [],
         description: user.description ?? '',
         avatar: user.avatar ?? '',
         header: user.header ?? '',
         created_at: new Date()
      })

      const error = userModel.validateSync()

      if (error) throw new ServiceError(ServiceErrorName.InvalidInput, error.message, error)

      try {
         await UserModel.create(userModel)
      } catch (error) {
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }
   }

   /***
      @throws ServiceError.InvalidInput
      @throws ServiceError.DatabaseError
   **/
   async updateUser(id: User['_id'], data: Partial<User>) {
      try {
         await UserModel.findByIdAndUpdate({ _id: id }, { $set: data }, { runValidators: true })
      } catch (error) {
         if (error.name === 'ValidationError') {
            const errorMessage = error.message
               .replace('Validation failed: ', '')
               .replace(/^[^:]+:/, '')

            throw new ServiceError(ServiceErrorName.InvalidInput, errorMessage, error)
         }

         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }
   }

   /**
      @throws ServiceError.DatabaseError
      @throws ServiceError.NotFound
   **/
   async syncUserRelationship(user_id: string, target_id: string, relationship: 'FOLLOW' | 'UNFOLLOW') {
      let user: User | null = null
      let target: User | null = null

      try {
         user = await this.findUser({ _id: user_id })
         target = await this.findUser({ _id: target_id })
      } catch (error) {
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }

      if (!user) throw new ServiceError(ServiceErrorName.NotFound, 'User not found', null, { user_id })
      if (!target) throw new ServiceError(ServiceErrorName.Unexpected, 'Target user not found', null, { target_id })

      if (relationship === 'UNFOLLOW' && !user.follows.includes(target.uuid)) {
         throw new ServiceError(ServiceErrorName.InvalidInput, 'User already unfollowed')
      }

      if (relationship === 'UNFOLLOW' && user.follows.includes(target.uuid)) {
         user.follows = user.follows.filter((el) => el !== target.uuid)
         target.followers = target.followers.filter((el) => el !== user.uuid)
      }

      if (relationship === 'FOLLOW' && user.follows.includes(target.uuid)) {
         throw new ServiceError(ServiceErrorName.InvalidInput, 'User already followed')
      }

      if (relationship === 'FOLLOW' && !user.follows.includes(target.uuid)) {
         user.follows.push(target.uuid)
         target.followers.push(user.uuid)
      }

      try {
         await this.updateUser(user._id, { follows: user.follows })
         await this.updateUser(target._id, { followers: target.followers })
      } catch (error) {
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }
   }
}
