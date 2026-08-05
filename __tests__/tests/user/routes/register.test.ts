import fs from 'fs/promises'
import path from 'path'

import TestServer from '../../../lib/server'

const URL = '/user/register'

describe('REGISTER CONTROLLER', () => {
   const server = new TestServer()

   const user = {
      username: 'johndoe',
      email: 'john@doe.com',
      password: 'password123',
      name: 'John Doe',
      birthday: new Date('2001-02-16').toISOString(),
      description: 'Hello world',
      avatar: Buffer.from('fake image data'),
      header: Buffer.from('fake image data')
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
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .field('description', user.description)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(201)
      })
   })

   describe('Content-Type Validation', () => {
      test('Should return 400 if Content-Type is application/json', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .set('Content-Type', 'application/json')
            .send(user)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_content_type')
      })

      test('Should return 400 if Content-Type is text/plain', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .set('Content-Type', 'text/plain')
            .send('username=johndoe&email=john@doe.com')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_content_type')
      })

      test('Should return 400 if Content-Type is application/x-www-form-urlencoded', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send('username=johndoe&email=john@doe.com')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_content_type')
      })

      test('Should return 201 if Content-Type is multipart/form-data', async () => {
         const { statusCode } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(201)
      })
   })

   describe('Field Validation - Required Fields', () => {
      test('Should return 400 if username is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('username')
         expect(body.data.username).toBeDefined()
         expect(body.data.username).toBe('')
      })

      test('Should return 400 if email is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('email')
         expect(body.data.email).toBeDefined()
         expect(body.data.email).toBe('')
      })

      test('Should return 400 if password is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('password')
         expect(body.data.password).toBeDefined()
         expect(body.data.password).toBe('')
      })

      test('Should return 400 if name is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('name')
         expect(body.data.name).toBeDefined()
         expect(body.data.name).toBe('')
      })

      test('Should return 400 if birthday is missing', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('birthday')
         expect(body.data.birthday).toBeDefined()
         expect(body.data.birthday).toBe('')
      })

      test('Should return 400 if only files are sent without text fields', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('username')
         expect(body.data.username).toBeDefined()
         expect(body.data.username).toBe('')
      })
   })

   describe('Field Validation - Username', () => {
      test('Should return 400 if username is less than minimum characters', async () => {
         const shortUsername = 'ab'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', shortUsername)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('username')
         expect(body.data.username).toBeDefined()
         expect(body.data.username).toBe(shortUsername)
      })

      test('Should return 400 if username exceeds maximum characters', async () => {
         const longUsername = 'a'.repeat(20 + 1)

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', longUsername)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('username')
         expect(body.data.username).toBeDefined()
         expect(body.data.username).toBe(longUsername)
      })

      test('Should return 400 if username contains invalid characters', async () => {
         const invalidUsername = 'john doe!'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', invalidUsername)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('username')
         expect(body.data.username).toBeDefined()
         expect(body.data.username).toBe(invalidUsername)
      })

      test('Should return 400 if username contains spaces', async () => {
         const spacedUsername = 'john doe'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', spacedUsername)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('username')
         expect(body.data.username).toBeDefined()
         expect(body.data.username).toBe(spacedUsername)
      })
   })

   describe('Field Validation - Email', () => {
      test('Should return 400 if email format is invalid', async () => {
         const invalidEmail = 'not-an-email'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', invalidEmail)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('email')
         expect(body.data.email).toBeDefined()
         expect(body.data.email).toBe(invalidEmail)
      })

      test('Should return 400 if email exceeds maximum characters', async () => {
         const longEmail = 'a'.repeat(255 + 10) + '@test.com'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', longEmail)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('email')
         expect(body.data.email).toBeDefined()
         expect(body.data.email).toBe(longEmail)
      })

      test('Should return 400 if email contains consecutive dots', async () => {
         const invalidEmail = 'a..b@test.com'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', invalidEmail)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('email')
         expect(body.data.email).toBeDefined()
         expect(body.data.email).toBe(invalidEmail)
      })

      test('Should return 400 if email TLD is too short', async () => {
         const invalidEmail = 'user@domain.c'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', invalidEmail)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('email')
         expect(body.data.email).toBeDefined()
         expect(body.data.email).toBe(invalidEmail)
      })

      test('Should return 400 if email contains a dash after the @', async () => {
         const invalidEmail = 'user@-test.com'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', invalidEmail)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('email')
         expect(body.data.email).toBeDefined()
         expect(body.data.email).toBe(invalidEmail)
      })

      test('Should return 201 if email contains uppercase characters', async () => {
         const uppercaseEmail = 'USER@Test.com'

         const { statusCode } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', uppercaseEmail)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(201)
      })
   })

   describe('Field Validation - Password', () => {
      test('Should return 400 if password is less than minimum characters', async () => {
         const shortPassword = 'pass'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', shortPassword)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('password')
         expect(body.data.password).toBeDefined()
         expect(body.data.password).toBe(shortPassword)
      })

      test('Should return 400 if password exceeds maximum characters', async () => {
         const longPassword = 'a'.repeat(255 + 1)

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', longPassword)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('password')
         expect(body.data.password).toBeDefined()
         expect(body.data.password).toBe(longPassword)
      })
   })

   describe('Field Validation - Name', () => {
      test('Should return 400 if name is less than minimum characters', async () => {
         const shortName = 'ab'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', shortName)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('name')
         expect(body.data.name).toBeDefined()
         expect(body.data.name).toBe(shortName)
      })

      test('Should return 400 if name exceeds maximum characters', async () => {
         const longName = 'a'.repeat(50 + 1)

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', longName)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('name')
         expect(body.data.name).toBeDefined()
         expect(body.data.name).toBe(longName)
      })
   })

   describe('Field Validation - Birthday', () => {
      test('Should return 400 if birthday format is invalid', async () => {
         const invalidBirthday = '16-02-2001'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', invalidBirthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('birthday')
         expect(body.data.birthday).toBeDefined()
         expect(body.data.birthday).toBe(invalidBirthday)
      })

      test('Should return 400 if birthday is not a valid date', async () => {
         const invalidBirthday = '2023-13-45'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', invalidBirthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('birthday')
         expect(body.data.birthday).toBeDefined()
         expect(body.data.birthday).toBe(invalidBirthday)
      })

      test('Should return 400 if birthday is a non-date string', async () => {
         const invalidBirthday = 'test'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', invalidBirthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('birthday')
         expect(body.data.birthday).toBeDefined()
         expect(body.data.birthday).toBe(invalidBirthday)
      })

      test('Should return 400 if birthday is the string "null"', async () => {
         const invalidBirthday = 'null'

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', invalidBirthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('birthday')
         expect(body.data.birthday).toBeDefined()
         expect(body.data.birthday).toBe(invalidBirthday)
      })
   })

   describe('Field Validation - Description', () => {
      test('Should return 400 if description exceeds maximum characters', async () => {
         const longDescription = 'a'.repeat(390 + 1)

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .field('description', longDescription)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('description')
         expect(body.data.description).toBeDefined()
         expect(body.data.description).toBe(longDescription)
      })
   })

   describe('Field Validation - Empty Strings', () => {
      test('Should return 400 if username is an empty string', async () => {
         const emptyUsername = ''

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', emptyUsername)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('username')
         expect(body.data.username).toBeDefined()
         expect(body.data.username).toBe(emptyUsername)
      })

      test('Should return 400 if email is an empty string', async () => {
         const emptyEmail = ''

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', emptyEmail)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('email')
         expect(body.data.email).toBeDefined()
         expect(body.data.email).toBe(emptyEmail)
      })

      test('Should return 400 if password is an empty string', async () => {
         const emptyPassword = ''

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', emptyPassword)
            .field('name', user.name)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('password')
         expect(body.data.password).toBeDefined()
         expect(body.data.password).toBe(emptyPassword)
      })

      test('Should return 400 if name is an empty string', async () => {
         const emptyName = ''

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', emptyName)
            .field('birthday', user.birthday)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('name')
         expect(body.data.name).toBeDefined()
         expect(body.data.name).toBe(emptyName)
      })

      test('Should return 400 if birthday is an empty string', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', '')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('birthday')
         expect(body.data.birthday).toBeDefined()
         expect(body.data.birthday).toBe('')
      })
   })

   describe('Uniqueness Validation', () => {
      beforeEach(async () => {
         await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
      })

      test('Should return 400 if username already exists', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', 'newemail@test.com')
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('username')
         expect(body.data.username).toBeDefined()
         expect(body.data.username).toBe(user.username)
      })

      test('Should return 400 if email already exists', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', 'differentuser')
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('email')
         expect(body.data.email).toBeDefined()
         expect(body.data.email).toBe(user.email)
      })
   })

   describe('Security', () => {
      test('Should return 400 if payload is too large', async () => {
         const largePayload = 'a'.repeat(10000)

         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', largePayload)
            .field('email', 'large@test.com')
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body).toHaveProperty('data')
         expect(body.error_name).toBe('invalid_input')
         expect(body.data).toHaveProperty('username')
         expect(body.data.username).toBeDefined()
         expect(body.data.username).toBe(largePayload)
      })
   })

   describe('File Upload', () => {
      test('Should return 201 with valid avatar image', async () => {
         const { statusCode } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(201)
      })

      test('Should return 201 with valid header image', async () => {
         const { statusCode } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(201)
      })

      test('Should return 400 if avatar has invalid mimetype', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', Buffer.from('fake file'), 'avatar.pdf')
            .attach('header', user.avatar, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_mimetype')
      })

      test('Should return 400 if header has invalid mimetype', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', Buffer.from('fake file'), 'header.pdf')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_mimetype')
      })

      test('Should return 201 with only an avatar image', async () => {
         const { statusCode } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')

         expect(statusCode).toBe(201)
      })

      test('Should return 201 with only a header image', async () => {
         const { statusCode } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(201)
      })

      test('Should return 400 if too many files are sent for a single field', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('avatar', user.avatar, 'avatar2.jpg')
            .attach('header', user.header, 'header.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('max_file_count_exceeded')
      })

      test('Should return 400 if an unexpected field is sent', async () => {
         const { statusCode, body } = await server.fetch
            .post(URL)
            .field('username', user.username)
            .field('email', user.email)
            .field('password', user.password)
            .field('name', user.name)
            .field('birthday', user.birthday)
            .attach('avatar', user.avatar, 'avatar.jpg')
            .attach('header', user.header, 'header.jpg')
            .attach('unexpected', user.avatar, 'unexpected.jpg')

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('unexpected_field')
      })
   })
})
