import type { NextFunction, Request, Response } from 'express'

import { type ExceptionBody } from '../../shared/response/http/ApiException'
import { ExceptionFactory } from '../../shared/response/http/ExceptionFactory'
import UserService from '../../user/services/user.service'
import AuthServiceException from '../errors/AuthServiceException'
import AccessTokenService from '../services/access_token.service'
import AuthService from '../services/auth.service'
import RefreshTokenService from '../services/refresh_token.service'

interface ReqQuery {
   grant_type?: 'password' | 'refresh_token'
}

interface SignInContract {
   email?: string
   password?: string
}

interface TokenGrantContract {
   refresh_token?: string
}

interface TokenDTO {
   access_token: string
   refresh_token: string
}

export default class LoginController {
   private readonly req: Request<any, any, SignInContract | TokenGrantContract, ReqQuery>
   private readonly res: Response<TokenDTO | ExceptionBody>
   private readonly next: NextFunction
   private readonly authService = new AuthService()
   private readonly accessTokenService = new AccessTokenService()
   private readonly refreshTokenService = new RefreshTokenService()
   private readonly userService = new UserService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req
      this.res = res
      this.next = next
      this.execute()
   }

   private async execute() {
      const { grant_type } = this.req.query
      let user_uuid: string

      if (this.req.headers['content-type'] !== 'application/json') {
         const exception = ExceptionFactory.contentTypeNotSupport('Content-Type header must be application/json')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (grant_type && !['refresh_token', 'password'].includes(grant_type)) {
         const exception = ExceptionFactory.invalidParam('Grant type not allowed')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (grant_type === 'password' || !grant_type) {
         const { email, password } = this.req.body as SignInContract

         if (!email || !password) {
            const exception = ExceptionFactory.invalidCredentials(!email ? 'Email not provided' : 'Password not provided')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         try {
            const user = await this.authService.authenticate({ accessMethod: 'email', email, password })
            user_uuid = user.uuid
         } catch (error: unknown) {
            if (!(error instanceof AuthServiceException)) return this.next(error)

            if (error.name === 'not_found' || error.name === 'invalid_credentials') {
               const exception = ExceptionFactory.invalidCredentials('Invalid email or password')
               return this.res.status(exception.status).json(exception.toJSON())
            }

            return this.next(error)
         }
      }

      if (grant_type === 'refresh_token') {
         const { refresh_token } = this.req.body as TokenGrantContract

         if (!refresh_token) {
            const exception = ExceptionFactory.invalidInput('Refresh token is required')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         try {
            const { user_uuid: token_user_uuid } = await this.refreshTokenService.verifyToken(refresh_token)
            const user = await this.userService.findUser({ uuid: token_user_uuid })
            user_uuid = user.uuid
         } catch (error: unknown) {
            if (!(error instanceof AuthServiceException)) return this.next(error)

            if (error.name === 'invalid_refresh_token') {
               const exception = ExceptionFactory.invalidRefreshToken()
               return this.res.status(exception.status).json(exception.toJSON())
            }

            if (error.name === 'expired_refresh_token') {
               const exception = ExceptionFactory.expiredRefreshToken()
               return this.res.status(exception.status).json(exception.toJSON())
            }

            if (error.name === 'token_already_used') {
               const exception = ExceptionFactory.tokenAlreadyUsed()
               return this.res.status(exception.status).json(exception.toJSON())
            }

            return this.next(error)
         }
      }

      const expiresTokensIn = {
         refresh_token: 15 * 60 * 1000,
         access_token: 3600
      }

      let access_token: string
      let refresh_token: string

      try {
         refresh_token = await this.refreshTokenService.createToken({
            user_uuid,
            token: 'refresh_token' in this.req.body ? this.req.body.refresh_token : null,
            expires_in: expiresTokensIn.refresh_token
         })

         access_token = this.accessTokenService.generateJWT(
            { user_uuid },
            { expiresIn: expiresTokensIn.access_token }
         )
      } catch (error: unknown) {
         return this.next(error)
      }

      return this.res
         .status(200)
         .cookie('access_token', access_token, { httpOnly: true, maxAge: expiresTokensIn.access_token })
         .cookie('refresh_token', refresh_token, { httpOnly: true, maxAge: expiresTokensIn.refresh_token })
         .json({ access_token, refresh_token })
   }
}
