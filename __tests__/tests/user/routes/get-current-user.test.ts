import { v4 as uuid } from 'uuid'

import AccessTokenService from '../../../../src/auth/services/access_token.service'
import ProfileModel from '../../../../src/user/models/profile.model'
import UserModel from '../../../../src/user/models/user.model'
import TestServer from '../../../lib/server'

const URL = '/user'

describe('GET CURRENT USER CONTROLLER', () => {
   const server = new TestServer()
   const accessTokenService = new AccessTokenService()

   const user = {
      username: 'johndoe',
      email: 'john@doe.com',
      password: 'password123',
      name: 'John Doe',
      birthday: new Date('2001-02-16').toISOString(),
      description: 'Hello world'
   }

   beforeEach(async () => {
      await registerUser(user)
   })

   afterAll(async () => {
      await server.closeConnection()
      server.server.httpServer.close()
   })

   afterEach(async () => {
      await server.clearDatabase()
   })

   async function registerUser(target: typeof user) {
      const user_uuid = uuid()

      await UserModel.create({
         uuid: user_uuid,
         username: target.username,
         email: target.email,
         password: target.password,
      })

      await ProfileModel.create({
         uuid: uuid(),
         user_uuid,
         name: target.name,
         birthday: new Date(target.birthday),
         description: target.description,
      })
   }

   async function getAccessToken(username: string) {
      const dbUser = await UserModel.findOne({ username })

      if (!dbUser) throw new Error('User not found')

      return accessTokenService.generateJWT({ user_uuid: dbUser.uuid }, { expiresIn: 3600 })
   }

   describe('Successful Current User', () => {
      test('Should return 200 with the current user data', async () => {
         const dbUser = await UserModel.findOne({ username: user.username })

         if (!dbUser) throw new Error('User not found')

         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/me`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('uuid')
         expect(body.uuid).toBeDefined()
         expect(body.uuid).toBe(dbUser.uuid)
         expect(body).toHaveProperty('username')
         expect(body.username).toBeDefined()
         expect(body.username).toBe(user.username)
         expect(body).toHaveProperty('email')
         expect(body.email).toBeDefined()
         expect(body.email).toBe(user.email)
         expect(body).toHaveProperty('status')
         expect(body.status).toBeDefined()
         expect(body.status).toBe('ACTIVE')
         expect(body).toHaveProperty('profile')
         expect(body.profile).toBeDefined()
         expect(body.profile).toBeInstanceOf(Object)
         expect(body.profile).toHaveProperty('name')
      })
   })

   describe('Current User Not Found', () => {

      test('Should return 404 if the user was deleted', async () => {
         const dbUser = await UserModel.findOne({ username: user.username })

         if (!dbUser) throw new Error('User not found')

         const token = accessTokenService.generateJWT({ user_uuid: dbUser.uuid }, { expiresIn: 3600 })

         await UserModel.deleteOne({ uuid: dbUser.uuid })

         const { statusCode, body } = await server.fetch
            .get(`${URL}/me`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(404)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('not_found')
      })

      test('Should return 500 if the user exists but the profile was deleted', async () => {
         const dbUser = await UserModel.findOne({ username: user.username })

         if (!dbUser) throw new Error('User not found')

         await ProfileModel.deleteMany({ user_uuid: dbUser.uuid })

         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/me`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(500)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('INTERNAL_SERVER_ERROR')
      })
   })

   describe('Authentication', () => {

      test('Should return 401 if the Authorization header is missing', async () => {
         const { statusCode, body } = await server.fetch.get(`${URL}/me`)

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('unauthorized')
      })

      test('Should return 401 if the Authorization header is not a bearer token', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/me`)
            .set('Authorization', 'invalid-token')

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_access_token')
      })

      test('Should return 401 if the access token is invalid', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/me`)
            .set('Authorization', 'Bearer invalidtoken')

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_access_token')
      })

      test('Should return 401 if the access token is expired', async () => {
         const dbUser = await UserModel.findOne({ username: user.username })

         if (!dbUser) throw new Error('User not found')

         const token = accessTokenService.generateJWT({ user_uuid: dbUser.uuid }, { expiresIn: -3600 })

         const { statusCode, body } = await server.fetch
            .get(`${URL}/me`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('expired_access_token')
      })

      test('Should return 401 if the access token has already been used', async () => {
         const token = await getAccessToken(user.username)

         await server.fetch
            .get(`${URL}/me`)
            .set('Authorization', `Bearer ${token}`)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/me`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('token_already_used')
      })
   })
})
