import bcrypt from 'bcrypt'

import ServiceError, { ServiceErrorName } from '@/shared/errors/ServiceError'

import UserModel, { type IUser } from '../../user/models/user.model'

type UserCredentials =
   | { accessMethod: 'email', email: string, password: string }
   | { accessMethod: 'username', username: string, password: string }

type User = Pick<IUser, '_id' | 'uuid' | 'username' | 'email' | 'encrypted_password'>
type UserProjection = { [key in keyof User]: boolean }

type AuthResult =
   | { success: true, user: User }
   | { success: false, reason: 'not_found' | 'invalid_credentials' }

export default class AuthService {
   private user_projection: UserProjection = {
      _id: true,
      uuid: true,
      username: true,
      email: true,
      encrypted_password: true
   }

   public async hashPassword(password: string): Promise<string> {
      return await bcrypt.hash(password, 10)
   }

   /***
   * @throws ServiceError.DatabaseError
   **/
   public async authenticate(credentials: UserCredentials): Promise<AuthResult> {
      let user: User | null = null

      try {
         if (credentials.accessMethod === 'email') {
            user = await UserModel
               .findOne({ email: credentials.email })
               .select(this.user_projection)
         }

         if (credentials.accessMethod === 'username') {
            user = await UserModel
               .findOne({ username: credentials.username })
               .select(this.user_projection)
         }
      } catch (error) {
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }

      if (!user) return { success: false, reason: 'not_found' }

      const isPasswordValid = await bcrypt.compare(credentials.password, user.encrypted_password.toString())

      if (!isPasswordValid) return { success: false, reason: 'invalid_credentials' }

      return { success: true, user: user }
   }
}
