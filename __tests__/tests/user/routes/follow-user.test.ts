import { v4 as uuid } from 'uuid'

import AccessTokenService from '../../../../src/auth/services/access_token.service'
import NotificationModel from '../../../../src/notification/models/notification.model'
import ProfileModel from '../../../../src/user/models/profile.model'
import UserModel from '../../../../src/user/models/user.model'
import TestServer from '../../../lib/server'

const URL = '/user'

describe('FOLLOW USER CONTROLLER', () => {
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

   const otherUser = {
      username: 'janedoe',
      email: 'jane@doe.com',
      password: 'password123',
      name: 'Jane Doe',
      birthday: new Date('1999-05-20').toISOString(),
      description: 'Hello from Jane'
   }

   beforeEach(async () => {
      await registerUser(user)
      await registerUser(otherUser)
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

   async function getUserUuid(username: string) {
      const dbUser = await UserModel.findOne({ username })

      if (!dbUser) throw new Error('User not found')

      return dbUser.uuid
   }

   describe('Successful Follow', () => {
      test('Should return 200 and create the follow relationship', async () => {
         const userUuid = await getUserUuid(user.username)
         const otherUserUuid = await getUserUuid(otherUser.username)
         const token = await getAccessToken(user.username)

         const { statusCode } = await server.fetch
            .post(`${URL}/${otherUser.username}/follow`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(200)

         const userProfile = await ProfileModel.findOne({ user_uuid: userUuid })
         const targetProfile = await ProfileModel.findOne({ user_uuid: otherUserUuid })

         expect(userProfile?.follows.includes(otherUserUuid)).toBe(true)
         expect(targetProfile?.followers.includes(userUuid)).toBe(true)
      })

      test('Should create a follow notification for the target user', async () => {
         const userUuid = await getUserUuid(user.username)
         const otherUserUuid = await getUserUuid(otherUser.username)
         const token = await getAccessToken(user.username)

         await server.fetch
            .post(`${URL}/${otherUser.username}/follow`)
            .set('Authorization', `Bearer ${token}`)

         const notification = await NotificationModel.findOne({ user_uuid: otherUserUuid, type: 'follow' })

         expect(notification).toBeDefined()
         expect(notification?.reference_uuid).toBe(userUuid)
      })
   })

   describe('User Not Found', () => {
      test('Should return 404 if the target user does not exist', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .post(`${URL}/nonexistentuser/follow`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(404)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('not_found')
      })
   })

   describe('Authentication', () => {
      test('Should return 401 if the Authorization header is missing', async () => {
         const { statusCode, body } = await server.fetch.post(`${URL}/${otherUser.username}/follow`)

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('unauthorized')
      })

      test('Should return 401 if the Authorization header is not a bearer token', async () => {
         const { statusCode, body } = await server.fetch
            .post(`${URL}/${otherUser.username}/follow`)
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
            .post(`${URL}/${otherUser.username}/follow`)
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
            .post(`${URL}/${otherUser.username}/follow`)
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
            .post(`${URL}/${otherUser.username}/follow`)
            .set('Authorization', `Bearer ${token}`)

         const { statusCode, body } = await server.fetch
            .post(`${URL}/${otherUser.username}/follow`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('token_already_used')
      })
   })

   describe('Validation Errors', () => {
      test('Should return 400 if the user tries to follow themselves', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .post(`${URL}/${user.username}/follow`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })

      test('Should return 400 if the user already follows the target', async () => {
         const firstToken = await getAccessToken(user.username)

         await server.fetch
            .post(`${URL}/${otherUser.username}/follow`)
            .set('Authorization', `Bearer ${firstToken}`)

         const secondToken = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .post(`${URL}/${otherUser.username}/follow`)
            .set('Authorization', `Bearer ${secondToken}`)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })
   })

   describe('Missing Profile', () => {
      test('Should return 500 if the authenticated user profile is missing', async () => {
         const userUuid = await getUserUuid(user.username)
         const token = await getAccessToken(user.username)

         await ProfileModel.deleteMany({ user_uuid: userUuid })

         const { statusCode, body } = await server.fetch
            .post(`${URL}/${otherUser.username}/follow`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(500)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('INTERNAL_SERVER_ERROR')
      })

      test('Should return 500 if the target user profile is missing', async () => {
         const otherUserUuid = await getUserUuid(otherUser.username)
         const token = await getAccessToken(user.username)

         await ProfileModel.deleteMany({ user_uuid: otherUserUuid })

         const { statusCode, body } = await server.fetch
            .post(`${URL}/${otherUser.username}/follow`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(500)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('INTERNAL_SERVER_ERROR')
      })
   })
})
