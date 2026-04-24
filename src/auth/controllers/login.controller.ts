import { type NextFunction, type Request, type Response } from 'express'
import { type ParamsDictionary } from 'express-serve-static-core'

import UserModel from '@/user/models/user.model'

import { type ExceptionBody } from '../../shared/response/http/ApiException'
import { ExceptionFactory } from '../../shared/response/http/ExceptionFactory'
import UserService from '../../user/services/user.service'
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

type User =
   | Extract<Awaited<ReturnType<typeof AuthService.prototype.authenticate>>, { success: true }>['user']
   | Extract<Awaited<ReturnType<typeof UserService.prototype.findUser>>, null>

export default class LoginController {
   private readonly req: Request<ParamsDictionary, any, SignInContract | TokenGrantContract, ReqQuery>
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

   private async execute(): Promise<any> {
      const { grant_type } = this.req.query
      let user: User

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
            const exception = ExceptionFactory.invalidCredentials((!email) ? 'Email not provided' : 'Password not provided')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         if (email.length > UserModel.schema['tree'].email.maxlength[0]) {
            const exception = ExceptionFactory.invalidCredentials('Email is too long')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         if (password.length > UserModel.schema['tree'].password.maxlength[0]) {
            const exception = ExceptionFactory.invalidCredentials('Password is too long')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         try {
            const result = await this.authService.authenticate({ accessMethod: 'email', email, password })
            // TODO: Add error when the account does not exist
            // TODO Implement request limit
            if (!result.success) {
               const exception = ExceptionFactory.invalidCredentials('Invalid email or password')
               return this.res.status(exception.status).json(exception.toJSON())
            }

            user = result.user
         } catch (err) {
            return this.next(err)
         }
      }

      if (grant_type === 'refresh_token') {
         const { refresh_token } = this.req.body as TokenGrantContract

         if (!refresh_token) {
            const exception = ExceptionFactory.invalidInput('Refresh token is required')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         try {
            const result = await this.refreshTokenService.verifyToken(refresh_token)

            if (result.error_name === 'invalid_refresh_token') {
               const exception = ExceptionFactory.invalidRefreshToken()
               return this.res.status(exception.status).json(exception.toJSON())
            }

            if (result.error_name === 'expired_refresh_token') {
               const exception = ExceptionFactory.expiredRefreshToken()
               return this.res.status(exception.status).json(exception.toJSON())
            }

            if (result.error_name === 'token_already_used') {
               const exception = ExceptionFactory.tokenAlreadyUsed()
               return this.res.status(exception.status).json(exception.toJSON())
            }

            user = await this.userService.findUser({ _id: result.user_id })
         } catch (err) {
            return this.next(err)
         }
      }

      const tokens: TokenDTO = {} as TokenDTO
      const expiresTokensIn = {
         refresh_token: 15 * 60 * 1000,
         access_token: 3600
      }

      try {
         tokens['refresh_token'] = await this.refreshTokenService.createToken({
            user_id: user._id,
            token: 'refresh_token' in this.req.body ? this.req.body.refresh_token : null,
            expires_in: expiresTokensIn.refresh_token
         })

         tokens['access_token'] = this.accessTokenService.generateJWT(
            { user_id: user._id, user_uuid: user.uuid },
            { expiresIn: expiresTokensIn.access_token }
         )
      } catch (err) {
         this.next(err)
      }

      return this.res
         .status(200)
         .cookie('access_token', tokens.access_token, { httpOnly: true, maxAge: expiresTokensIn.access_token })
         .cookie('refresh_token', tokens.refresh_token, { httpOnly: true, maxAge: expiresTokensIn.refresh_token })
         .json(tokens)
   }
}
