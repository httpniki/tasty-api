import AccessTokenService from '../../../../../src/auth/services/access_token.service'
import ApiException from '../../../../../src/shared/response/http/ApiException'
import { ExceptionFactory } from '../../../../../src/shared/response/http/ExceptionFactory'

const AUTH_ERRORS = {
   invalidAccessToken: ExceptionFactory.invalidAccessToken().error_name,
   expiredAccessToken: ExceptionFactory.expiredAccessToken().error_name
}

describe('AuthService - decodeToken', () => {
   const accessTokenService = new AccessTokenService()
   const user_id = '5f81c3d7c4b0d1d4d0e0f1f2'
   const user_uuid = '5f81c3d7c4b0d1d4d0e0f1f2'
   const token = accessTokenService.generateJWT({ user_id, user_uuid }, { expiresIn: 3600 })

   test('Should return payload for valid token', async () => {
      const decodedToken = accessTokenService.decodeToken(token)

      expect(decodedToken).not.toBeNull()
      expect(decodedToken?.user_id).toBe(user_id)
   })

   test('Should return invalidAccessToken for invalid token', async () => {
      try {
         accessTokenService.decodeToken('invalid token')
      } catch (err) {
         expect(err).toBeInstanceOf(ApiException)
         expect(err.error_name).toBe(AUTH_ERRORS.invalidAccessToken)
      }
   })

   test('Should return expiredAccessToken for expired token', async () => {
      const token = accessTokenService.generateJWT({ user_id, user_uuid }, { expiresIn: 0 })

      try {
         accessTokenService.decodeToken(token)
      } catch (err) {
         expect(err).toBeInstanceOf(ApiException)
         expect(err.error_name).toBe(AUTH_ERRORS.expiredAccessToken)
      }
   })
})
