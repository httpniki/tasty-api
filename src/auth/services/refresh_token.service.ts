import Crypto from 'crypto'

import ServiceError, { ServiceErrorName } from '@/shared/errors/ServiceError'

import { type IUser } from '../../user/models/user.model'
import RefreshTokenModel, { type IRefreshToken } from '../models/refresh_token.model'

interface CreateTokenPayload {
   user_id: IUser['_id'] | string
   expires_in: number,
   token?: string | null
}

interface VerifyTokenResult {
   token: string,
   user_id: string | null
   error_name?: 'invalid_refresh_token' | 'expired_refresh_token' | 'token_already_used'
   message?: string
}

export default class RefreshTokenService {
   /***
      @throws ServiceError.DatabaseError
   **/
   public async createToken({ token, user_id, expires_in }: CreateTokenPayload): Promise<string> {
      try {
         const currentToken = await RefreshTokenModel.findOne({ token })

         if (currentToken) {
            currentToken.revoked = true
            await currentToken.save()
         }
      } catch (err) {
         throw new ServiceError(ServiceErrorName.DatabaseError, err.message, err)
      }

      const tokenModel = new RefreshTokenModel({
         token: Crypto.randomBytes(16).toString('hex'),
         createdAt: new Date(),
         expiresAt: new Date(Date.now() + expires_in),
         user: user_id,
         parent: token ? token : null
      })

      try {
         await RefreshTokenModel.create(tokenModel)
      } catch (err) {
         throw new ServiceError(ServiceErrorName.DatabaseError, err.message, err)
      }

      return tokenModel.token
   }

   /***
      @throws ServiceError.DatabaseError
   **/
   public async verifyToken(token: string): Promise<VerifyTokenResult> {
      let tokenModel: IRefreshToken
      const result: VerifyTokenResult = { user_id: null, token: token }

      try {
         tokenModel = await RefreshTokenModel
            .findOne()
            .where({ 'token': token })

         if (!tokenModel) {
            result.error_name = 'invalid_refresh_token'
            result.message = 'Invalid refresh token'
            return result
         }

         result.user_id = tokenModel.user.toString()
      } catch (err) {
         throw new ServiceError(ServiceErrorName.DatabaseError, err.message, err)
      }

      if (tokenModel.expiresAt < new Date()) {
         result.error_name = 'expired_refresh_token'
         result.message = 'Refresh token expired'
         return result
      }

      if (tokenModel.revoked) {
         result.error_name = 'token_already_used'
         result.message = 'Token already used'
         return result
      }

      return result
   }
}
