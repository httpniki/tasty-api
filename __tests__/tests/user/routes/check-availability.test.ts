import { v4 as uuid } from 'uuid'

import UserModel from '../../../../src/user/models/user.model'
import TestServer from '../../../lib/server'

const USER_URL = '/user/check-availability'

describe('CHECK AVAILABILITY CONTROLLER', () => {
   const server = new TestServer()

   const user = {
      uuid: uuid(),
      username: 'johndoe',
      email: 'john@doe.com',
      password: 'password123',
      encrypted_password: 'hashedpassword',
      name: 'John Doe',
      birthday: '2001-02-16',
   }

   beforeAll(async () => {
      await UserModel.create(user)
   })

   afterAll(async () => {
      await server.clearDatabase()
      await server.closeConnection()
      server.server.httpServer.close()
   })

   describe('Successful Check - Username', () => {
      test('Should return 200 with isAvailable true when username is available', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'username', value: 'availableUsername' })

         expect(statusCode).toBe(200)
         expect(body.isAvailable).toBe(true)
      })

      test('Should return 200 with isAvailable false when username is taken', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'username', value: user.username })

         expect(statusCode).toBe(200)
         expect(body.isAvailable).toBe(false)
      })

      test('Should return 200 with isAvailable false when username is too short', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'username', value: 'ab' })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('isAvailable')
         expect(body.isAvailable).toBeDefined()
         expect(body.isAvailable).toBe(false)
         expect(body).toHaveProperty('message')
         expect(body.message).toBeDefined()
         expect(body.message).toBe('Username is too short')
      })

      test('Should return 200 with isAvailable false when username is too long', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'username', value: 'a'.repeat(20 + 1) })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('isAvailable')
         expect(body.isAvailable).toBeDefined()
         expect(body.isAvailable).toBe(false)
         expect(body).toHaveProperty('message')
         expect(body.message).toBeDefined()
         expect(body.message).toBe('Username is too long')
      })

      test('Should return 200 with isAvailable false when username format is invalid', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'username', value: 'john doe' })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('isAvailable')
         expect(body.isAvailable).toBeDefined()
         expect(body.isAvailable).toBe(false)
         expect(body).toHaveProperty('message')
         expect(body.message).toBeDefined()
         expect(body.message).toBe('Invalid username format')
      })
   })

   describe('Successful Check - Email', () => {
      test('Should return 200 with isAvailable true when email is available', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'email', value: 'available@email.com' })

         expect(statusCode).toBe(200)
         expect(body.isAvailable).toBe(true)
      })

      test('Should return 200 with isAvailable false when email is taken', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'email', value: user.email })

         expect(statusCode).toBe(200)
         expect(body.isAvailable).toBe(false)
      })

      test('Should return 200 with isAvailable false when email is too long', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'email', value: 'a'.repeat(255 + 1) + '@test.com' })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('isAvailable')
         expect(body.isAvailable).toBeDefined()
         expect(body.isAvailable).toBe(false)
         expect(body).toHaveProperty('message')
         expect(body.message).toBeDefined()
         expect(body.message).toBe('Email is too long')
      })

      test('Should return 200 with isAvailable false when email format is invalid', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'email', value: 'not-an-email' })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('isAvailable')
         expect(body.isAvailable).toBeDefined()
         expect(body.isAvailable).toBe(false)
         expect(body).toHaveProperty('message')
         expect(body.message).toBeDefined()
         expect(body.message).toBe('Invalid email format')
      })
   })

   describe('Validation Errors', () => {
      test('Should return 400 if field is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ value: user.username })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
      })

      test('Should return 400 if value is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'username' })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
      })

      test('Should return 400 if both field and value are missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({})

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
      })

      test('Should return 400 if field is invalid', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'invalid', value: user.username })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
      })

      test('Should return 400 if field is empty string', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: '', value: user.username })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
      })

      test('Should return 400 if value is empty string', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'username', value: '' })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_input')
      })
   })

   describe('Content-Type Validation', () => {
      test('Should return 400 if Content-Type is multipart/form-data', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .set('Content-Type', 'multipart/form-data')
            .field('field', 'username')
            .field('value', user.username)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_content_type')
      })

      test('Should return 400 if Content-Type is text/plain', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .set('Content-Type', 'text/plain')
            .send('field=username&value=test')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_content_type')
      })

      test('Should return 400 if Content-Type is missing', async () => {
         const { statusCode, body } = await server.fetch.post(USER_URL)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_content_type')
      })

      test('Should return 200 if Content-Type is application/json with charset', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .set('Content-Type', 'application/json; charset=utf-8')
            .send({ field: 'username', value: 'availableUsername' })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('isAvailable')
         expect(body.isAvailable).toBeDefined()
         expect(body.isAvailable).toBe(true)
      })
   })
})
