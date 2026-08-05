import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'

import { AuthServiceExceptionFactory } from '../errors/AuthServiceException'
import RevokedTokenModel, { type IRevokedToken } from '../models/revoked_token.model'
import { type TokenBody, type TokenOptions, type TokenPayload } from '../types/types'

export default class AccessTokenService {
   public decodeToken(token: string): TokenPayload {
      let payload: TokenPayload

      try {
         payload = jwt.verify(token, process.env.AUTH_TOKEN_PRIVATE_KEY as string) as TokenPayload
      } catch (err) {
         if (err instanceof jwt.TokenExpiredError) throw AuthServiceExceptionFactory.expiredAccessToken()
         if (err instanceof jwt.JsonWebTokenError) throw AuthServiceExceptionFactory.invalidAccessToken()
         throw err
      }

      return payload
   }

   public generateJWT(body: TokenBody, opts?: TokenOptions): string {
      const payload: TokenPayload = {
         ...body,
         jwtId: uuid(),
         exp: Math.floor(Date.now() / 1000) + opts.expiresIn,
         iat: Math.floor(Date.now() / 1000)
      }

      return jwt.sign(payload, process.env.AUTH_TOKEN_PRIVATE_KEY as string)
   }

   public async revokeAccessToken(
      token: string,
      reason: IRevokedToken['reason'],
      jwtId: string,
      user_uuid: string,
      expiresAt: number
   ): Promise<void> {
      const revokedTokenModel = new RevokedTokenModel({
         uuid: jwtId,
         token,
         user_uuid,
         revokedAt: new Date(),
         expiresAt: new Date(expiresAt * 1000),
         reason
      })

      await revokedTokenModel.save()
   }

   public async isTokenRevoked(token: string): Promise<boolean> {
      const result = await RevokedTokenModel
         .findOne()
         .where({ token })
         .select({ _id: true })

      return !!result
   }
}
