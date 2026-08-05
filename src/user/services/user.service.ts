import { Error as MongooseError } from 'mongoose'
import { v4 as uuid } from 'uuid'

import { UserServiceExceptionFactory } from '../errors/UserServiceException'
import UserModel, { type IUser } from '../models/user.model'

type User = Omit<IUser, 'password' | '_id'>

interface FindUserArguments {
   email?: string
   username?: string | { $regex: RegExp }
   uuid?: string
}

interface Paging {
   page: number
   limit: number
   max_page: number
   total_results: number
}

interface UsersWithPaging {
   users: User[]
   paging: Paging
}

type NewUserSchema = Pick<IUser, 'username' | 'email' | 'password'>

export default class UserService {
   private user_projection = {
      uuid: true,
      username: true,
      email: true,
      created_at: true,
      encrypted_password: true,
      status: true
   }

   async findUser(args: FindUserArguments): Promise<User> {
      const result = await UserModel
         .findOne()
         .where(args)
         .select(this.user_projection)

      if (!result) throw UserServiceExceptionFactory.userNotFound(args as any)

      const user = result.toObject()

      return {
         uuid: user.uuid,
         username: user.username,
         email: user.email,
         created_at: user.created_at,
         encrypted_password: user.encrypted_password,
         status: user.status
      }
   }

   async findUsers(username: RegExp, page = 1, limit = 20): Promise<UsersWithPaging> {
      const [results, totalResults] = await Promise.all([
         UserModel
            .find({ username: { $regex: username } })
            .select(this.user_projection)
            .skip((page - 1) * limit)
            .limit(limit),
         UserModel.countDocuments({
            username: { $regex: username }
         })
      ])

      const users: User[] = results.map((u) => {
         const user = u.toObject()

         return {
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            created_at: user.created_at,
            encrypted_password: user.encrypted_password,
            status: user.status
         }
      })

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

   async createUser(user: NewUserSchema): Promise<User> {
      const user_uuid = uuid()

      const userModel = new UserModel({
         uuid: user_uuid,
         email: user.email,
         password: user.password,
         username: user.username
      })

      const err = await userModel.validate()
         .catch((err: MongooseError.ValidationError) => {
            const validationErr = Object.values(err.errors).find(error => error instanceof MongooseError.ValidatorError)
            if (validationErr) return validationErr

            const castError = Object.values(err.errors).find(error => error instanceof MongooseError.CastError)
            return castError
         })

      if (err instanceof MongooseError.ValidatorError) throw UserServiceExceptionFactory.validationError(err.message, { [err.properties.path]: err.properties.value ?? '' })
      if (err instanceof MongooseError.CastError) throw err

      const isNotAvailableEmail = await UserModel.findOne({ email: user.email })
      if (isNotAvailableEmail) throw UserServiceExceptionFactory.validationError('Email already used', { email: user.email })

      const isNotAvailableUsername = await UserModel.findOne({ username: user.username })
      if (isNotAvailableUsername) throw UserServiceExceptionFactory.validationError('Username already used', { username: user.username })

      return await userModel
         .save()
         .then((u) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _id, password, ...user } = u.toObject()
            return user
         })
         .catch((err) => {
            throw err
         })
   }

   async updateUser(user_uuid: string, data: Partial<Omit<User, 'uuid' | 'password' | 'encrypted_password' | '_id'>>): Promise<User> {
      const user = UserModel.findOne({ uuid: user_uuid })

      if (!user) throw UserServiceExceptionFactory.userNotFound({ uuid: user_uuid })

      return await UserModel.findOneAndUpdate({ runValidators: true })
         .where({ uuid: user_uuid })
         .set(data)
         .then((u) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _id, password, ...user } = u
            return user
         })
         .catch((err) => {
            if (err instanceof MongooseError.ValidatorError) {
               throw UserServiceExceptionFactory.validationError(err.message, { [err.path]: err.message })
            }

            throw err
         })
   }
}
