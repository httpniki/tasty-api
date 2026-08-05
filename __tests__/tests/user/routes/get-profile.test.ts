import AccessTokenService from '../../../../src/auth/services/access_token.service'
import ProfileModel from '../../../../src/user/models/profile.model'
import UserModel from '../../../../src/user/models/user.model'
import ProfileService from '../../../../src/user/services/profile.service'
import TestServer from '../../../lib/server'

const URL = '/user'

describe('GET PROFILE CONTROLLER', () => {
   const server = new TestServer()
   const accessTokenService = new AccessTokenService()
   const profileService = new ProfileService()

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
      await server.fetch
         .post('/user/register')
         .field('username', user.username)
         .field('email', user.email)
         .field('password', user.password)
         .field('name', user.name)
         .field('birthday', user.birthday)
         .field('description', user.description)
   })

   afterAll(async () => {
      await server.closeConnection()
      server.server.httpServer.close()
   })

   afterEach(async () => {
      await server.clearDatabase()
   })

   async function getAccessToken(username: string) {
      const dbUser = await UserModel.findOne({ username })

      if (!dbUser) throw new Error('User not found')

      return accessTokenService.generateJWT({ user_uuid: dbUser.uuid }, { expiresIn: 3600 })
   }

   async function followUser(followerUsername: string, followedUsername: string) {
      const follower = await UserModel.findOne({ username: followerUsername })
      const followed = await UserModel.findOne({ username: followedUsername })

      if (!follower || !followed) throw new Error('User not found')

      await profileService.syncUserRelationship(follower.uuid, followed.uuid, 'FOLLOW')
   }

   describe('Successful Profile', () => {
      test('Should return 200 with a body object', async () => {
         const { statusCode, body } = await server.fetch.get(`${URL}/${user.username}`)

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
      })
   })

   describe('Profile Not Found', () => {
      test('Should return 404 if the user does not exist', async () => {
         const { statusCode, body } = await server.fetch.get(`${URL}/nonexistentuser`)

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

         const { statusCode, body } = await server.fetch.get(`${URL}/${user.username}`)

         expect(statusCode).toBe(500)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('INTERNAL_SERVER_ERROR')
      })
   })

   describe('Authentication', () => {
      test('Should return 401 if the Authorization header is not a bearer token', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/${user.username}`)
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
            .get(`${URL}/${user.username}`)
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
            .get(`${URL}/${user.username}`)
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
            .get(`${URL}/${user.username}`)
            .set('Authorization', `Bearer ${token}`)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/${user.username}`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('token_already_used')
      })
   })

   describe('Follow Relationships', () => {
      beforeEach(async () => {
         await server.fetch
            .post('/user/register')
            .field('username', otherUser.username)
            .field('email', otherUser.email)
            .field('password', otherUser.password)
            .field('name', otherUser.name)
            .field('birthday', otherUser.birthday)
            .field('description', otherUser.description)
      })

      test('Should return followed false and follower false when not authenticated', async () => {
         const { statusCode, body } = await server.fetch.get(`${URL}/${otherUser.username}`)

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('followed')
         expect(body.followed).toBeDefined()
         expect(body.followed).toBe(false)
         expect(body).toHaveProperty('follower')
         expect(body.follower).toBeDefined()
         expect(body.follower).toBe(false)
      })

      test('Should return followed true when the authenticated user follows the searched user', async () => {
         await followUser(user.username, otherUser.username)
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/${otherUser.username}`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('followed')
         expect(body.followed).toBeDefined()
         expect(body.followed).toBe(true)
         expect(body).toHaveProperty('follower')
         expect(body.follower).toBeDefined()
         expect(body.follower).toBe(false)
      })

      test('Should return follower true when the searched user follows the authenticated user', async () => {
         await followUser(otherUser.username, user.username)
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/${otherUser.username}`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('followed')
         expect(body.followed).toBeDefined()
         expect(body.followed).toBe(false)
         expect(body).toHaveProperty('follower')
         expect(body.follower).toBeDefined()
         expect(body.follower).toBe(true)
      })

      test('Should return followed false and follower false when there is no relationship', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/${otherUser.username}`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('followed')
         expect(body.followed).toBeDefined()
         expect(body.followed).toBe(false)
         expect(body).toHaveProperty('follower')
         expect(body.follower).toBeDefined()
         expect(body.follower).toBe(false)
      })

      test('Should return current_user true when requesting your own profile', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/${user.username}`)
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('current_user')
         expect(body.current_user).toBeDefined()
         expect(body.current_user).toBe(true)
      })
   })
})
