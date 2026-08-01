import Crypto from 'crypto'

import { AuthServiceExceptionFactory } from '../errors/AuthServiceException'
import RefreshTokenModel, { type IRefreshToken } from '../models/refresh_token.model'

interface CreateTokenPayload {
   user_uuid: IRefreshToken['user_uuid'],
   expires_in: number,
   token?: string | null
}

export default class RefreshTokenService {
   public async createToken({ token, user_uuid, expires_in }: CreateTokenPayload): Promise<string> {
      const currentToken = token ? await RefreshTokenModel.findOne({ token }) : null

      if (currentToken) {
         currentToken.revoked = true
         await currentToken.save()
      }

      const tokenModel = new RefreshTokenModel({
         token: Crypto.randomBytes(16).toString('hex'),
         createdAt: new Date(),
         expiresAt: new Date(Date.now() + expires_in),
         user_uuid,
         parent: token ? token : null
      })

      await RefreshTokenModel.create(tokenModel)

      return tokenModel.token
   }

   public async verifyToken(token: string): Promise<{ user_uuid: string }> {
      const tokenModel: IRefreshToken = token
         ? await RefreshTokenModel
            .findOne()
            .where({ 'token': token })
            .select({ user_uuid: true, expiresAt: true, revoked: true })
         : null

      if (!tokenModel) throw AuthServiceExceptionFactory.invalidRefreshToken()
      if (tokenModel.expiresAt < new Date()) throw AuthServiceExceptionFactory.expiredRefreshToken()
      if (tokenModel.revoked) throw AuthServiceExceptionFactory.tokenAlreadyUsed()

      return { user_uuid: tokenModel.user_uuid }
   }
}
