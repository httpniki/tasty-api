import fs from 'fs/promises'
import path from 'path'
import { v4 as uuid } from 'uuid'

import AccessTokenService from '../../../../src/auth/services/access_token.service'
import ProfileModel from '../../../../src/user/models/profile.model'
import UserModel from '../../../../src/user/models/user.model'
import TestServer from '../../../lib/server'

const URL = '/user'

describe('UPDATE PROFILE CONTROLLER', () => {
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

   const imageBuffer = Buffer.from('fake image data')

   beforeEach(async () => {
      await registerUser(user)
   })

   afterAll(async () => {
      await server.closeConnection()
      server.server.httpServer.close()
   })

   afterEach(async () => {
      await server.clearDatabase()

      if (process.env.USER_FILES_PATH === undefined) return

      const files = await fs.readdir(process.env.USER_FILES_PATH)

      files.forEach(async (file) => {
         const mimetype = file.split('.')[1]
         if (!['png', 'jpg', 'jpeg', 'webp'].includes(mimetype)) return
         if (process.env.USER_FILES_PATH === undefined) return

         await fs.unlink(path.join(process.env.USER_FILES_PATH, file))
      })
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

   async function getProfile(username: string) {
      const dbUser = await UserModel.findOne({ username })

      if (!dbUser) throw new Error('User not found')

      const profile = await ProfileModel.findOne({ user_uuid: dbUser.uuid })

      if (!profile) throw new Error('Profile not found')

      return profile
   }

   describe('Successful Update', () => {
      test('Should return 200 and update the name and description', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'New Name')
            .field('description', 'New description')

         expect(statusCode).toBe(200)

         const profile = await getProfile(user.username)

         expect(profile.name).toBe('New Name')
         expect(profile.description).toBe('New description')
      })

      test('Should return 200 and update the avatar when an avatar is uploaded', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .attach('avatar', imageBuffer, 'avatar.jpg')

         expect(statusCode).toBe(200)

         const profile = await getProfile(user.username)

         expect(profile.avatar).toBeDefined()
         expect(profile.avatar).toHaveLength(32)
         expect(profile.header).toBeUndefined()
      })

      test('Should return 200 and update the header when a header is uploaded', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .attach('header', imageBuffer, 'header.jpg')

         expect(statusCode).toBe(200)

         const profile = await getProfile(user.username)

         expect(profile.header).toBeDefined()
         expect(profile.header).toHaveLength(32)
         expect(profile.avatar).toBeUndefined()
      })

      test('Should return 200 and keep the avatar untouched when no avatar is sent', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'Updated Name')
            .attach('header', imageBuffer, 'header.jpg')

         expect(statusCode).toBe(200)

         const profile = await getProfile(user.username)

         expect(profile.avatar).toBeUndefined()
         expect(profile.header).toBeDefined()
         expect(profile.name).toBe('Updated Name')
      })

      test('Should return 200 and keep the header untouched when no header is sent', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'Updated Name')
            .attach('avatar', imageBuffer, 'avatar.jpg')

         expect(statusCode).toBe(200)

         const profile = await getProfile(user.username)

         expect(profile.header).toBeUndefined()
         expect(profile.avatar).toBeDefined()
         expect(profile.name).toBe('Updated Name')
      })

      test('Should return 200 and delete the avatar when delete_avatar is true', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('delete_avatar', 'true')

         expect(statusCode).toBe(200)

         const profile = await getProfile(user.username)

         expect(profile.avatar).toBe('')
      })

      test('Should return 200 when no changes are sent', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', user.name)

         expect(statusCode).toBe(200)

         const profile = await getProfile(user.username)

         expect(profile.name).toBe(user.name)
      })
   })

   describe('Birthday Field', () => {
      test('Should return 400 invalid_input if the birthday is invalid', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'New Name')
            .field('birthday', 'not-a-date')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
         expect(body).toHaveProperty('data')
         expect(body.data).toHaveProperty('birthday')
         expect(body.data.birthday).toBeDefined()
         expect(body.data.birthday).toBe('not-a-date')
      })

      test('Should return 200 and update the birthday', async () => {
         const token = await getAccessToken(user.username)
         const newBirthday = new Date('1990-01-01').toISOString()

         const { statusCode } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'New Name')
            .field('birthday', newBirthday)

         expect(statusCode).toBe(200)

         const profile = await getProfile(user.username)

         expect(profile.name).toBe('New Name')
         expect(profile.birthday.toISOString()).toBe(newBirthday)
      })
   })

   describe('Content-Type Validation', () => {
      test('Should return 400 if Content-Type is application/json', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'application/json')
            .send({ name: 'New Name' })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_content_type')
      })

      test('Should return 400 if Content-Type is text/plain', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'text/plain')
            .send('name=New Name')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_content_type')
      })

      test('Should return 400 if Content-Type is application/x-www-form-urlencoded', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send('name=New Name')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_content_type')
      })

      test('Should return 400 if Content-Type is missing', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_content_type')
      })
   })

   describe('Authentication', () => {
      test('Should return 401 if the Authorization header is missing', async () => {
         const { statusCode, body } = await server.fetch.put(`${URL}/profile`)

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('unauthorized')
      })

      test('Should return 401 if the Authorization header is not a bearer token', async () => {
         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
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
            .put(`${URL}/profile`)
            .set('Authorization', 'Bearer invalidtoken')

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_access_token')
      })

      test('Should return 401 if the access token is empty', async () => {
         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', 'Bearer ')

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
            .put(`${URL}/profile`)
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
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'New Name')

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'New Name')

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('token_already_used')
      })
   })

   describe('Profile Errors', () => {
      test('Should return 500 if the user was deleted', async () => {
         const dbUser = await UserModel.findOne({ username: user.username })

         if (!dbUser) throw new Error('User not found')

         const token = accessTokenService.generateJWT({ user_uuid: dbUser.uuid }, { expiresIn: 3600 })

         await UserModel.deleteOne({ uuid: dbUser.uuid })

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'New Name')

         expect(statusCode).toBe(500)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('INTERNAL_SERVER_ERROR')
      })

      test('Should return 500 if the profile was deleted', async () => {
         const dbUser = await UserModel.findOne({ username: user.username })

         if (!dbUser) throw new Error('User not found')

         const token = accessTokenService.generateJWT({ user_uuid: dbUser.uuid }, { expiresIn: 3600 })

         await ProfileModel.deleteMany({ user_uuid: dbUser.uuid })

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'New Name')

         expect(statusCode).toBe(500)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('INTERNAL_SERVER_ERROR')
      })
   })

   describe('Validation Errors', () => {
      test('Should return 400 invalid_input if the name is too short', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'ab')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
         expect(body).toHaveProperty('data')
         expect(body.data).toHaveProperty('name')
         expect(body.data.name).toBeDefined()
         expect(body.data.name).toBe('ab')
      })

      test('Should return 400 invalid_input if the name is too long', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'a'.repeat(50 + 1))

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
         expect(body).toHaveProperty('data')
         expect(body.data).toHaveProperty('name')
         expect(body.data.name).toBeDefined()
         expect(body.data.name).toBe('a'.repeat(50 + 1))
      })

      test('Should return 400 invalid_input if the name is an empty string', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', '')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
         expect(body).toHaveProperty('data')
         expect(body.data).toHaveProperty('name')
         expect(body.data.name).toBeDefined()
         expect(body.data.name).toBe('')
      })

      test('Should return 400 invalid_input if the description is too long', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('description', 'a'.repeat(390 + 1))

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
         expect(body).toHaveProperty('data')
         expect(body.data).toHaveProperty('description')
         expect(body.data.description).toBeDefined()
         expect(body.data.description).toBe('a'.repeat(390 + 1))
      })
   })

   describe('Delete Flags Validation', () => {
      test('Should return 200 and ignore delete_avatar when it is not true or false', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('delete_avatar', 'yes')

         expect(statusCode).toBe(200)

         const profile = await getProfile(user.username)

         expect(profile.avatar).toBeUndefined()
      })

      test('Should return 200 and ignore delete_header when it is not true or false', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('delete_header', '1')

         expect(statusCode).toBe(200)

         const profile = await getProfile(user.username)

         expect(profile.header).toBeUndefined()
      })
   })

   describe('Delete and Upload Conflicts', () => {
      test('Should return 400 invalid_input if delete_avatar is true and an avatar is uploaded', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('delete_avatar', 'true')
            .attach('avatar', imageBuffer, 'avatar.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
      })

      test('Should return 400 invalid_input if delete_header is false and a header is uploaded', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .field('delete_header', 'false')
            .attach('header', imageBuffer, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
      })
   })

   describe('File Validation', () => {
      test('Should return 400 invalid_mimetype if the avatar has an invalid mimetype', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .attach('avatar', Buffer.from('fake file'), 'avatar.pdf')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_mimetype')
      })

      test('Should return 400 invalid_mimetype if the header has an invalid mimetype', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .attach('header', Buffer.from('fake file'), 'header.pdf')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_mimetype')
      })

      test('Should return 400 max_file_count_exceeded if two avatars are uploaded', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .attach('avatar', imageBuffer, 'avatar.jpg')
            .attach('avatar', imageBuffer, 'avatar2.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('max_file_count_exceeded')
      })

      test('Should return 400 max_file_count_exceeded if two headers are uploaded', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .attach('header', imageBuffer, 'header.jpg')
            .attach('header', imageBuffer, 'header2.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('max_file_count_exceeded')
      })

      test('Should return 400 unexpected_field if an unexpected field is uploaded', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .put(`${URL}/profile`)
            .set('Authorization', `Bearer ${token}`)
            .attach('unexpected', imageBuffer, 'unexpected.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('unexpected_field')
      })
   })
})
