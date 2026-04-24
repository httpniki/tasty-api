import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '../shared/response/http/ExceptionFactory'
import AccessTokenService from './services/access_token.service'
import { type TokenPayload } from './types/types'

export class Auth {
   static consumeAccess(opts?: { required?: boolean }) {
      const { required = true } = opts || {}

      return function <T extends (...args: any[]) => any>(target: T, _: DecoratorContext) {
         return async function(this: any, req: Request, res: Response, next: NextFunction) {

            const accessTokenService = new AccessTokenService()
            let decodedToken: TokenPayload

            if (!req.headers.authorization && required) {
               const exception = ExceptionFactory.unauthorized()
               return res.status(exception.status).json(exception.toJSON())
            }

            if (!req.headers.authorization && !required) {
               return await target.call(this, req, res, next)
            }

            if (!req.headers.authorization.toLowerCase().startsWith('bearer ')) {
               const expception = ExceptionFactory.invalidAccessToken('Invalid access token')
               return res.status(expception.status).json(expception.toJSON())
            }

            const accessToken = req.headers.authorization.split(' ')[1]
            let isRevoked = false

            try {
               isRevoked = await accessTokenService.isTokenRevoked(accessToken)
            } catch (err) {
               return next(err)
            }

            if (isRevoked) {
               const exception = ExceptionFactory.tokenAlreadyUsed('Access Token Token already used')
               return res.status(exception.status).json(exception.toJSON())
            }

            try {
               const decodeResult = accessTokenService.decodeToken(accessToken)

               if (decodeResult.error_name === 'invalid_access_token') {
                  const exception = ExceptionFactory.invalidAccessToken()
                  return res.status(exception.status).json(exception.toJSON())
               }

               if (decodeResult.error_name === 'expired_access_token') {
                  const exception = ExceptionFactory.expiredAccessToken()
                  return res.status(exception.status).json(exception.toJSON())
               }

               decodedToken = decodeResult.payload
            } catch (error) {
               return next(error)
            }

            const token = accessTokenService.generateJWT(
               { user_id: decodedToken.user_id, user_uuid: decodedToken.user_uuid },
               { expiresIn: 3600 }
            )

            try {
               await accessTokenService.revokeAccessToken(
                  accessToken, 'logout',
                  decodedToken.jwtId,
                  decodedToken.user_id,
                  decodedToken.exp
               )
            } catch (err) {
               return next(err)
            }

            req.session = {
               user_id: decodedToken.user_id,
               user_uuid: decodedToken.user_uuid
            }

            res.cookie('access_token', token, { httpOnly: true, maxAge: 3600 })
            return await target.call(this, req, res, next)
         }
      }
   }
}
