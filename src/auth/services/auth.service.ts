import bcrypt from 'bcrypt'

import UserModel, { type IUser } from '../../user/models/user.model'
import { AuthServiceExceptionFactory } from '../errors/AuthServiceException'

type UserCredentials =
   | { accessMethod: 'email', email: string, password: string }
   | { accessMethod: 'username', username: string, password: string }

type User = Pick<IUser, 'uuid' | 'username' | 'email' | 'encrypted_password' | 'created_at' | 'status'>

export default class AuthService {
   private user_projection: { [key in keyof User]: boolean } = {
      uuid: true,
      username: true,
      email: true,
      encrypted_password: true,
      created_at: true,
      status: true
   }

   public async hashPassword(password: string): Promise<string> {
      return await bcrypt.hash(password, 10)
   }

   public async authenticate(credentials: UserCredentials): Promise<User> {
      let user: User | null = null

      if (credentials.accessMethod === 'email') {
         const result = await UserModel
            .findOne({ email: credentials.email })
            .select(this.user_projection)

         if (!result) throw AuthServiceExceptionFactory.notFound('Invalid credentials', { email: credentials.email })

         user = result.toJSON()
      }

      if (credentials.accessMethod === 'username') {
         const result = await UserModel
            .findOne({ username: credentials.username })
            .select(this.user_projection)

         if (!result) throw AuthServiceExceptionFactory.notFound('User not found', { username: credentials.username })

         user = result.toJSON()
      }

      const isPasswordValid = await bcrypt.compare(credentials.password, user.encrypted_password.toString())
      if (!isPasswordValid) throw AuthServiceExceptionFactory.invalidCredentials('Invalid credentials', credentials)

      return {
         encrypted_password: user.encrypted_password,
         uuid: user.uuid,
         username: user.username,
         email: user.email,
         created_at: user.created_at,
         status: user.status
      }
   }
}
