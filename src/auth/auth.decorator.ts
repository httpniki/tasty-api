import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '../shared/response/http/ExceptionFactory'
import AuthServiceException from './errors/AuthServiceException'
import AccessTokenService from './services/access_token.service'
import { type TokenPayload } from './types/types'

export class Auth {
   static consumeAccess(opts?: { required?: boolean }) {
      const { required = true } = opts || {}

      return function <T extends (...args: any[]) => any>(target: T, _: DecoratorContext) {
         return async function(this: any, req: Request, res: Response, next: NextFunction) {
            const accessTokenService = new AccessTokenService()

            if (!req.headers.authorization && required) {
               const exception = ExceptionFactory.unauthorized()
               return res.status(exception.status).json(exception.toJSON())
            }

            if (!req.headers.authorization && !required) {
               return await target.call(this, req, res, next)
            }

            if (!req.headers.authorization.toLowerCase().startsWith('bearer ')) {
               const exception = ExceptionFactory.invalidAccessToken('Invalid access token')
               return res.status(exception.status).json(exception.toJSON())
            }

            const accessToken = req.headers.authorization.split(' ')[1]
            let decodedToken: TokenPayload
            let isRevoked = false

            try {
               decodedToken = accessTokenService.decodeToken(accessToken)
            } catch (error) {
               if (error instanceof AuthServiceException && error.name === 'invalid_access_token') {
                  const exception = ExceptionFactory.invalidAccessToken()
                  return res.status(exception.status).json(exception.toJSON())
               }

               if (error instanceof AuthServiceException && error.name === 'expired_access_token') {
                  const exception = ExceptionFactory.expiredAccessToken()
                  return res.status(exception.status).json(exception.toJSON())
               }

               return next(error)
            }

            try {
               isRevoked = await accessTokenService.isTokenRevoked(accessToken)
            } catch (error) {
               return next(error)
            }

            if (isRevoked) {
               const exception = ExceptionFactory.tokenAlreadyUsed('Access Token Token already used')
               return res.status(exception.status).json(exception.toJSON())
            }

            try {
               await accessTokenService.revokeAccessToken(
                  accessToken,
                  'consumed',
                  decodedToken.jwtId,
                  decodedToken.user_uuid,
                  decodedToken.exp
               )
            } catch (error) {
               return next(error)
            }

            req.session = {
               user_uuid: decodedToken.user_uuid
            }

            return await target.call(this, req, res, next)
         }
      }
   }
}
