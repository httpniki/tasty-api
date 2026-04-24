import fs from 'fs/promises'
import path from 'path'

import { ExceptionFactory } from '../../../../src/shared/response/http/ExceptionFactory'
import UserModel from '../../../../src/user/models/user.model'
import TestServer from '../../../lib/server'

const USER_URL = '/user/register'

const FAKE_IMAGE = Buffer.from('fake image data')

const AUTH_ERRORS = {
   invalidInput: ExceptionFactory.invalidInput('').error_name,
   invalidContentType: ExceptionFactory.contentTypeNotSupport('').error_name,
   invalidMimetype: ExceptionFactory.invalidMimetype('').error_name,
}

const VALIDATION_LIMITS = {
   username: {
      min: UserModel.schema['tree'].username.minlength[0],
      max: UserModel.schema['tree'].username.maxlength[0],
   },
   email: {
      max: UserModel.schema['tree'].email.maxlength[0],
   },
   password: {
      min: UserModel.schema['tree'].password.minlength[0],
      max: UserModel.schema['tree'].password.maxlength[0],
   },
   name: {
      min: UserModel.schema['tree'].name.minlength[0],
      max: UserModel.schema['tree'].name.maxlength[0],
   },
   description: {
      max: UserModel.schema['tree'].description.maxlength[0],
   },
}

describe('REGISTER CONTROLLER', () => {
   const server = new TestServer()

   const user = {
      username: 'johndoe',
      email: 'john@doe.com',
      password: 'password123',
      name: 'John Doe',
      birthday: '2001-02-16',
      description: 'Hello world'
   }

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

   describe('Successful Registration', () => {
      test('Should return 201 with all valid fields', async () => {
         const { statusCode } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .field('description', user.description)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(201)
      })
   })

   describe('Content-Type Validation', () => {
      test('Should return 400 if Content-Type is application/json', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .set('Content-Type', 'application/json')
            .send(user)

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidContentType)
      })

      test('Should return 400 if Content-Type is text/plain', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .set('Content-Type', 'text/plain')
            .send('username=johndoe&email=john@doe.com')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidContentType)
      })

      test('Should return 201 if Content-Type is multipart/form-data', async () => {
         const { statusCode } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(201)
      })
   })

   describe('Field Validation - Required Fields', () => {
      test('Should return 400 if username is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if email is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if password is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if name is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if birthday is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })
   })

   describe('Field Validation - Username', () => {
      test('Should return 400 if username is less than minimum characters', async () => {
         const shortUsername = 'ab'
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', shortUsername)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if username exceeds maximum characters', async () => {
         const longUsername = 'a'.repeat(VALIDATION_LIMITS.username.max + 1)
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', longUsername)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if username contains invalid characters', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', 'john doe!')
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if username contains spaces', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', 'john doe')
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })
   })

   describe('Field Validation - Email', () => {
      test('Should return 400 if email format is invalid', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', 'not-an-email')
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if email exceeds maximum characters', async () => {
         const longEmail = 'a'.repeat(VALIDATION_LIMITS.email.max + 10) + '@test.com'
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', longEmail)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })
   })

   describe('Field Validation - Password', () => {
      test('Should return 400 if password is less than minimum characters', async () => {
         const shortPassword = 'pass'
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', shortPassword)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if password exceeds maximum characters', async () => {
         const longPassword = 'a'.repeat(VALIDATION_LIMITS.password.max + 1)
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', longPassword)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })
   })

   describe('Field Validation - Name', () => {
      test('Should return 400 if name is less than minimum characters', async () => {
         const shortName = 'ab'
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', shortName)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if name exceeds maximum characters', async () => {
         const longName = 'a'.repeat(VALIDATION_LIMITS.name.max + 1)
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', longName)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })
   })

   describe('Field Validation - Birthday', () => {
      test('Should return 400 if birthday format is invalid', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', '16-02-2001')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if birthday is not a valid date', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', '2023-13-45')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })
   })

   describe('Field Validation - Description', () => {
      test('Should return 400 if description exceeds maximum characters', async () => {
         const longDescription = 'a'.repeat(VALIDATION_LIMITS.description.max + 1)
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .field('description', longDescription)

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })
   })

   describe('Uniqueness Validation', () => {
      beforeEach(async () => {
         await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
      })

      test('Should return 400 if username already exists', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', 'newemail@test.com')
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })

      test('Should return 400 if email already exists', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', 'differentuser')
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidInput)
      })
   })

   describe('Security', () => {
      test('Should return 400 if payload is too large', async () => {
         const largePayload = 'a'.repeat(10000)
         const { statusCode } = await server.fetch
            .post(USER_URL)
            .field('username', largePayload)
            .field('email', 'large@test.com')
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
      })
   })

   describe('File Upload', () => {
      test('Should return 201 with valid avatar image', async () => {
         const { statusCode } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(201)
      })

      test('Should return 201 with valid header image', async () => {
         const { statusCode } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(201)
      })

      test('Should return 400 if avatar has invalid mimetype', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', Buffer.from('fake file'), 'avatar.pdf')
            .attach('header', FAKE_IMAGE, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidMimetype)
      })

      test('Should return 400 if header has invalid mimetype', async () => {
         const { statusCode, body } = await server.fetch
            .post(USER_URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', FAKE_IMAGE, 'avatar.jpg')
            .attach('header', Buffer.from('fake file'), 'header.pdf')

         expect(statusCode).toBe(400)
         expect(body.error_name).toBe(AUTH_ERRORS.invalidMimetype)
      })
   })
})
