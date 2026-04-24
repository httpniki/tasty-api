import Crypto from 'crypto'
import { v4 as uuid } from 'uuid'

import RefreshTokenModel from '../../../../src/auth/models/refresh_token.model'
import AuthService from '../../../../src/auth/services/auth.service'
import RefreshTokenService from '../../../../src/auth/services/refresh_token.service'
import { ExceptionFactory } from '../../../../src/shared/response/http/ExceptionFactory'
import UserModel from '../../../../src/user/models/user.model'
import TestServer from '../../../lib/server'

const AUTH_URL = '/auth/token'

const AUTH_ERRORS = {
   invalidCredentials: ExceptionFactory.invalidCredentials('').error_name,
   invalidContentType: ExceptionFactory.contentTypeNotSupport('').error_name,
   invalidParams: ExceptionFactory.invalidParam('').error_name,
   invalidInput: ExceptionFactory.invalidInput('').error_name,
   invalidRefreshToken: ExceptionFactory.invalidRefreshToken().error_name,
   expiredRefreshToken: ExceptionFactory.expiredRefreshToken().error_name,
   tokenAlreadyUsed: ExceptionFactory.tokenAlreadyUsed().error_name,
}

describe('LOGIN CONTROLLER', () => {
   const server = new TestServer()
   const authService = new AuthService()

   const user = {
      uuid: uuid(),
      username: 'johndoe',
      password: 'john1234',
      email: 'john@doe.com',
      encrypted_password: '',
      name: 'John Doe',
      birthday: '2001-02-16',
      avatar: new File([''], 'avatar.jpg', { type: 'image/jpeg' }),
      header: new File([''], 'header.jpg', { type: 'image/jpeg' })
   }

   beforeAll(async () => {
      user.encrypted_password = await authService.hashPassword(user.password)
      await UserModel.create(user)
   })

   afterAll(async () => {
      await server.clearDatabase()
      await server.closeConnection()
      server.server.httpServer.close()
   })

   describe('Password Grant Type (default)', () => {
      test('Should return 200', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({ email: user.email, password: user.password })

         expect(statusCode).toBe(200)
         expect(body.access_token).toBeDefined()
         expect(body.refresh_token).toBeDefined()
      })

      test('Should return 400 if email is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({ password: user.password })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })

      test('Should return 400 if password is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({ email: user.email })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })

      test('Should return 400 if the email is incorrect', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({ email: 'wrong@example.com', password: user.password })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })

      test('Should return 400 if password is incorrect', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({ email: user.email, password: 'wrongpassword' })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })

      test('Should return 400 if Content-Type is text/plain', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .set('Content-Type', 'text/plain')
            .send('email=john@doe.com&password=john1234')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidContentType)
      })

      test('Should return 400 if Content-Type is not application/json', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .set('Content-Type', 'multipart/form-data')
            .field('email', user.email)
            .field('password', user.password)

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidContentType)
      })

      test('Should return 400 if body is empty', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({})

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })

      test('Should return 400 if grant_type is invalid', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL).query({ grant_type: 'facebook' })
            .send({ email: user.email, password: user.password })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidParams)
      })

      test('Should return 400 if email contains SQL injection attempt', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({ email: '\' OR \'1\'=\'1@doe.com', password: user.password })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })

      test('Should return 400 if payload is too large (email extremely long)', async () => {
         const longEmail = 'a'.repeat(10000) + '@doe.com'
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({ email: longEmail, password: user.password })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })

      test('Should return 400 if both email and password are missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({})

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })

      test('Should return 400 if email is null', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({ email: null, password: user.password })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })

      test('Should return 400 if password is null', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({ email: user.email, password: null })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })

      test('Should return 400 if email is undefined', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({ email: undefined, password: user.password })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })

      test('Should return 400 if password is undefined', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({ email: user.email, password: undefined })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidCredentials)
      })
   })

   describe('Refresh Token Grant Type', () => {
      let refreshToken: string = ''

      beforeEach(async () => {
         const { body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'password' })
            .send({
               email: user.email,
               password: user.password
            })

         if (!body.access_token) throw new Error('Access token is missing')
         if (!body.refresh_token) throw new Error('Refresh token is missing')

         refreshToken = body.refresh_token
      })

      test('Should return 200 and tokens if refresh_token is valid', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'refresh_token' })
            .send({ refresh_token: refreshToken })

         expect(statusCode).toBe(200)
         expect(body.access_token).toBeDefined()
         expect(body.refresh_token).toBeDefined()
      })

      test('Should return 400 if refresh_token is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'refresh_token' })
            .send({})

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 401 if refresh_token is invalid', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'refresh_token' })
            .send({ refresh_token: 'invalid' })

         expect(statusCode).toBe(401)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidRefreshToken)
      })

      test('Should return 401 if refresh_token is expired', async () => {
         const userDoc = await UserModel.findOne({ email: user.email })
         if (!userDoc) throw new Error('User not found')

         const expiredToken = Crypto.randomBytes(16).toString('hex')

         await RefreshTokenModel.create({
            token: expiredToken,
            createdAt: new Date(Date.now() - 100000),
            expiresAt: new Date(Date.now() - 1000),
            user: userDoc._id,
            revoked: false
         })

         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'refresh_token' })
            .send({ refresh_token: expiredToken })

         expect(statusCode).toBe(401)
         expect(body.error_name).toBe(AUTH_ERRORS.expiredRefreshToken)
      })

      test('Should return 401 if refresh_token is revoked (already used)', async () => {
         const refreshTokenService = new RefreshTokenService()
         const userDoc = await UserModel.findOne({ email: user.email })
         if (!userDoc) throw new Error('User not found')

         await refreshTokenService.createToken({
            token: refreshToken,
            user_id: userDoc._id,
            expires_in: 15 * 60 * 1000
         })

         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'refresh_token' })
            .send({ refresh_token: refreshToken })

         expect(statusCode).toBe(401)
         expect(body.error_name).toBe(AUTH_ERRORS.tokenAlreadyUsed)
      })

      test('Should return 400 if grant_type is not allowed', async () => {
         const { statusCode, body } = await server.fetch
            .post(AUTH_URL)
            .query({ grant_type: 'invalid_grant' })
            .send({})

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidParams)
      })
   })

   describe('Refresh Token Full Flow', () => {
      test('Should complete full refresh token flow', async () => {
         const firstLogin = await server.fetch
            .post(AUTH_URL).query({ grant_type: 'password' })
            .send({ email: user.email, password: user.password })

         expect(firstLogin.statusCode).toBe(200)
         expect(firstLogin.body.access_token).toBeDefined()

         const refreshToken1 = firstLogin.body.refresh_token

         const secondLogin = await server.fetch
            .post(AUTH_URL).query({ grant_type: 'refresh_token' })
            .send({ refresh_token: refreshToken1 })

         expect(secondLogin.statusCode).toBe(200)
         expect(secondLogin.body.access_token).toBeDefined()

         const refreshToken2 = secondLogin.body.refresh_token

         const { statusCode: revokedStatus, body: revokedBody } = await server.fetch
            .post(AUTH_URL).query({ grant_type: 'refresh_token' })
            .send({ refresh_token: refreshToken1 })

         expect(revokedStatus).toBe(401)
         expect(revokedBody.error_name).toBe(AUTH_ERRORS.tokenAlreadyUsed)

         const { statusCode: newTokenStatus, body: newTokenBody } = await server.fetch
            .post(AUTH_URL).query({ grant_type: 'refresh_token' })
            .send({ refresh_token: refreshToken2 })

         expect(newTokenStatus).toBe(200)
         expect(newTokenBody.access_token).toBeDefined()
         expect(newTokenBody.refresh_token).toBeDefined()
      })
   })
})
