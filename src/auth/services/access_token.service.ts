import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'

import ServiceError, { ServiceErrorName } from '@/shared/errors/ServiceError'

import RevokedTokenModel, { type IRevokedToken } from '../models/revoked_token.model'
import { type TokenBody, type TokenOptions, type TokenPayload } from '../types/types'

interface DecodeResult {
   payload: TokenPayload | null
   error_name?: 'invalid_access_token' | 'expired_access_token'
   message?: string
}

export default class AccessTokenService {
   /***
      @throws ServiceError.InvalidInput
   **/
   public decodeToken(token: string): DecodeResult {
      const result: DecodeResult = { payload: null }

      try {
         result.payload = jwt.verify(token, process.env.AUTH_TOKEN_PRIVATE_KEY as string) as TokenPayload
      } catch (err) {
         if (err instanceof jwt.TokenExpiredError) {
            result.error_name = 'expired_access_token'
            result.message = 'Expired access token'
            return result
         }

         if (err instanceof jwt.JsonWebTokenError) {
            result.error_name = 'invalid_access_token'
            result.message = 'Invalid access token'
            return result
         }

         throw new ServiceError(ServiceErrorName.InvalidInput, err.message, err)
      }

      return result
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

   /***
      @throws ServiceError.DatabaseError
   **/
   public async revokeAccessToken(
      token: string,
      reason: 'logout' | 'refresh' | 'admin' = 'refresh',
      jwtId: string,
      userId: string,
      expiresAt: number
   ): Promise<void> {
      try {
         await RevokedTokenModel.create({
            uuid: jwtId,
            token,
            user: userId,
            revokedAt: new Date(),
            expiresAt: new Date(expiresAt * 1000),
            reason
         })
      } catch (err) {
         throw new ServiceError(ServiceErrorName.DatabaseError, err.message, err)
      }
   }

   /***
      @throws ServiceError.DatabaseError
   **/
   public async isTokenRevoked(token: string): Promise<boolean> {
      let isRevoked: IRevokedToken | null = null

      try {
         isRevoked = await RevokedTokenModel.findOne({ token })
      } catch (err) {
         throw new ServiceError(ServiceErrorName.DatabaseError, err.message, err)
      }

      return !!isRevoked
   }
}
