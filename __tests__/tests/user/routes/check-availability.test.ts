import { v4 as uuid } from 'uuid'

import { ExceptionFactory } from '../../../../src/shared/response/http/ExceptionFactory'
import UserModel from '../../../../src/user/models/user.model'
import TestServer from '../../../lib/server'

const USER_URL = '/user/check-availability'

const AUTH_ERRORS = {
   invalidInput: ExceptionFactory.invalidInput('').error_name,
   invalidContentType: ExceptionFactory.contentTypeNotSupport('').error_name,
}

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
   })

   describe('Validation Errors', () => {
      test('Should return 400 if field is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ value: user.username })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if value is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'username' })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if both field and value are missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({})

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if field is invalid', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'invalid', value: user.username })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if field is empty string', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: '', value: user.username })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if value is empty string', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .send({ field: 'username', value: '' })

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
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
         expect(body.error_name).toBe(AUTH_ERRORS.invalidContentType)
      })

      test('Should return 400 if Content-Type is text/plain', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .set('Content-Type', 'text/plain')
            .send('field=username&value=test')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidContentType)
      })
   })
})
