import { v4 as uuid } from 'uuid'

import AccessTokenService from '../../../../src/auth/services/access_token.service'
import AuthService from '../../../../src/auth/services/auth.service'
import { ExceptionFactory } from '../../../../src/shared/response/http/ExceptionFactory'
import UserModel from '../../../../src/user/models/user.model'
import TestServer from '../../../lib/server'

const POSTS_URL = '/posts'

const POST_ERRORS = {
   invalidAccessToken: ExceptionFactory.invalidAccessToken().error_name,
   expiredAccessToken: ExceptionFactory.expiredAccessToken().error_name,
   unauthorized: ExceptionFactory.unauthorized().error_name,
   invalidInput: ExceptionFactory.invalidInput('').error_name,
   tokenAlreadyUsed: ExceptionFactory.tokenAlreadyUsed().error_name,
}

describe('CREATE POST CONTROLLER', () => {
   const server = new TestServer()
   const authService = new AuthService()
   const accessTokenService = new AccessTokenService()

   const user = {
      uuid: uuid(),
      username: 'johndoe',
      password: 'john1234',
      email: 'john@doe.com',
      encrypted_password: '',
      name: 'John Doe',
      birthday: '2001-02-16',
   }

   let accessToken: string
   let userId: string

   beforeAll(async () => {
      user.encrypted_password = await authService.hashPassword(user.password)
      const createdUser = await UserModel.create(user)
      userId = createdUser._id.toString()

      const loginResponse = await server.fetch
         .post('/auth/token')
         .query({ grant_type: 'password' })
         .send({ email: user.email, password: user.password })

      accessToken = loginResponse.body.access_token
   })

   afterAll(async () => {
      await server.clearDatabase()
      await server.closeConnection()
      server.server.httpServer.close()
   })

   afterEach(async () => {
      await server.clearDatabase()
   })

   describe('Successful Creation', () => {
      test('Should return 201 with valid token and content', async () => {
         const { statusCode, body } = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: 'Hello world!' })

         expect(statusCode).toBe(201)
         expect(body.uuid).toBeDefined()
         expect(body.content).toBe('Hello world!')
         expect(body.user).toBeDefined()
      })

      test('Should refresh token on successful post creation', async () => {
         const { headers } = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: 'Hello world!' })

         expect(headers['set-cookie']).toBeDefined()
         expect(headers['set-cookie'][0]).toContain('access_token=')
      })
   })

   describe('Authorization', () => {
      test('Should return 401 if authorization header is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(POSTS_URL)
            .send({ content: 'Hello world!' })

         expect(statusCode).toBe(401)
         expect(body.error_name).toBe(POST_ERRORS.unauthorized)
      })

      test('Should return 401 if authorization header does not start with Bearer', async () => {
         const { statusCode, body } = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Basic ${accessToken}`)
            .send({ content: 'Hello world!' })

         expect(statusCode).toBe(401)
         expect(body.error_name).toBe(POST_ERRORS.invalidAccessToken)
      })

      test('Should return 401 if access token is invalid', async () => {
         const { statusCode, body } = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', 'Bearer invalid_token')
            .send({ content: 'Hello world!' })

         expect(statusCode).toBe(401)
         expect(body.error_name).toBe(POST_ERRORS.invalidAccessToken)
      })

      test('Should return 401 if access token is expired', async () => {
         const expiredToken = accessTokenService.generateJWT(
            { user_id: userId, user_uuid: user.uuid },
            { expiresIn: -3600 }
         )

         const { statusCode, body } = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${expiredToken}`)
            .send({ content: 'Hello world!' })

         expect(statusCode).toBe(401)
         expect(body.error_name).toBe(POST_ERRORS.expiredAccessToken)
      })

      test('Should return 401 if access token has already been used (revoked)', async () => {
         const usedToken = accessTokenService.generateJWT(
            { user_id: userId, user_uuid: user.uuid },
            { expiresIn: 3600 }
         )

         await accessTokenService.revokeAccessToken(
            usedToken,
            'logout',
            uuid(),
            userId,
            Math.floor(Date.now() / 1000) + 3600
         )

         const { statusCode, body } = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${usedToken}`)
            .send({ content: 'Hello world!' })

         expect(statusCode).toBe(401)
         expect(body.error_name).toBe(POST_ERRORS.tokenAlreadyUsed)
      })

      test('Should return 401 if using a previously refreshed token', async () => {
         const oldToken = accessToken

         await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${oldToken}`)
            .send({ content: 'First post' })

         const { statusCode } = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${oldToken}`)
            .send({ content: 'Second post with revoked token' })

         expect(statusCode).toBe(401)
      })

      test('Should be able to use new token after refresh', async () => {
         const firstResponse = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: 'First post' })

         expect(firstResponse.statusCode).toBe(201)

         const setCookies = firstResponse.headers['set-cookie']
         const newToken = setCookies[0].match(/access_token=([^;]+)/)?.[1]

         expect(newToken).toBeDefined()

         const secondResponse = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${newToken}`)
            .send({ content: 'Second post' })

         expect(secondResponse.statusCode).toBe(201)
      })
   })

   describe('Content Validation', () => {
      test('Should return 400 if content is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({})

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(POST_ERRORS.invalidInput)
      })

      test('Should return 400 if content is empty', async () => {
         const { statusCode, body } = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: '' })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(POST_ERRORS.invalidInput)
      })

      test('Should return 201 if content is a valid string', async () => {
         const { statusCode, body } = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: 'Valid content' })

         expect(statusCode).toBe(201)
         expect(body.content).toBe('Valid content')
      })
   })

   describe('User Not Found', () => {
      test('Should return 500 if user does not exist in database', async () => {
         await server.clearDatabase()

         const { statusCode } = await server.fetch
            .post(POSTS_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: 'Hello world!' })

         expect(statusCode).toBe(500)
      })
   })
})