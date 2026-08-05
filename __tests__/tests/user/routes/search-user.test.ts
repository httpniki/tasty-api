import AccessTokenService from '../../../../src/auth/services/access_token.service'
import ProfileModel from '../../../../src/user/models/profile.model'
import UserModel from '../../../../src/user/models/user.model'
import ProfileService from '../../../../src/user/services/profile.service'
import TestServer from '../../../lib/server'

const URL = '/user'

describe('SEARCH USERS CONTROLLER', () => {
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

   const thirdUser = {
      username: 'johnsmith',
      email: 'john@smith.com',
      password: 'password123',
      name: 'John Smith',
      birthday: new Date('1998-11-03').toISOString(),
      description: 'Hello from John Smith'
   }

   beforeEach(async () => {
      await registerUser(user)
      await registerUser(otherUser)
      await registerUser(thirdUser)
   })

   afterAll(async () => {
      await server.closeConnection()
      server.server.httpServer.close()
   })

   afterEach(async () => {
      await server.clearDatabase()
   })

   async function registerUser(target: typeof user) {
      await server.fetch
         .post('/user/register')
         .field('username', target.username)
         .field('email', target.email)
         .field('password', target.password)
         .field('name', target.name)
         .field('birthday', target.birthday)
         .field('description', target.description)
   }

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

   describe('Successful Search', () => {
      test('Should return 200 with the matched user when searching by exact username', async () => {
         const { statusCode, body } = await server.fetch.get(`${URL}/search`).query({ q: 'janedoe' })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('data')
         expect(body.data).toBeDefined()
         expect(Array.isArray(body.data)).toBe(true)
         expect(body.data.length).toBe(1)
         expect(body.data[0]).toHaveProperty('username')
         expect(body.data[0].username).toBeDefined()
         expect(body.data[0].username).toBe(otherUser.username)
         expect(body.data[0]).toHaveProperty('name')
         expect(body.data[0].name).toBeDefined()
         expect(body.data[0].name).toBe(otherUser.name)
         expect(body.data[0]).toHaveProperty('uuid')
         expect(body.data[0].uuid).toBeDefined()
         expect(body.data[0]).toHaveProperty('followed')
         expect(body.data[0].followed).toBeDefined()
         expect(body.data[0].followed).toBe(false)
         expect(body.data[0]).toHaveProperty('follower')
         expect(body.data[0].follower).toBeDefined()
         expect(body.data[0].follower).toBe(false)
      })

      test('Should return 200 with the matched user when searching is case insensitive', async () => {
         const { statusCode, body } = await server.fetch.get(`${URL}/search`).query({ q: 'JOHN' })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('data')
         expect(body.data).toBeDefined()
         expect(Array.isArray(body.data)).toBe(true)
         expect(body.data.length).toBe(2)
         expect(body.data.some((result: any) => result.username === user.username)).toBe(true)
         expect(body.data.some((result: any) => result.username === thirdUser.username)).toBe(true)
      })

      test('Should return 200 with an empty data array when there are no matches', async () => {
         const { statusCode, body } = await server.fetch.get(`${URL}/search`).query({ q: 'zzzzzz' })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('data')
         expect(body.data).toBeDefined()
         expect(Array.isArray(body.data)).toBe(true)
         expect(body.data.length).toBe(0)
         expect(body).toHaveProperty('paging')
         expect(body.paging).toBeDefined()
         expect(body.paging).toHaveProperty('total_results')
         expect(body.paging.total_results).toBeDefined()
         expect(body.paging.total_results).toBe(0)
         expect(body.paging).toHaveProperty('max_page')
         expect(body.paging.max_page).toBeDefined()
         expect(body.paging.max_page).toBe(0)
      })

      test('Should return 200 when not authenticated (auth is optional)', async () => {
         const { statusCode, body } = await server.fetch.get(`${URL}/search`).query({ q: 'janedoe' })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
      })
   })

   describe('Missing or Invalid Query', () => {
      test('Should return 400 invalid_params if the q query parameter is missing', async () => {
         const { statusCode, body } = await server.fetch.get(`${URL}/search`)

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })

      test('Should return 400 invalid_params if the q query parameter is not a string', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: ['a', 'b'] })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })
   })

   describe('Pagination', () => {
      test('Should return the first page with the correct limit', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 1, limit: 1 })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('data')
         expect(body.data).toBeDefined()
         expect(Array.isArray(body.data)).toBe(true)
         expect(body.data.length).toBe(1)
         expect(body.data[0].username).toBe(user.username)
         expect(body).toHaveProperty('paging')
         expect(body.paging).toBeDefined()
         expect(body.paging.page).toBe(1)
         expect(body.paging.limit).toBe(1)
         expect(body.paging.total_results).toBe(3)
         expect(body.paging.max_page).toBe(3)
      })

      test('Should return the second page with the correct results', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 2, limit: 1 })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('data')
         expect(body.data).toBeDefined()
         expect(Array.isArray(body.data)).toBe(true)
         expect(body.data.length).toBe(1)
         expect(body.data[0].username).toBe(otherUser.username)
         expect(body).toHaveProperty('paging')
         expect(body.paging).toBeDefined()
         expect(body.paging.page).toBe(2)
         expect(body.paging.limit).toBe(1)
         expect(body.paging.total_results).toBe(3)
         expect(body.paging.max_page).toBe(3)
      })

      test('Should return the third page with the correct results', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 3, limit: 1 })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('data')
         expect(body.data).toBeDefined()
         expect(Array.isArray(body.data)).toBe(true)
         expect(body.data.length).toBe(1)
         expect(body.data[0].username).toBe(thirdUser.username)
         expect(body).toHaveProperty('paging')
         expect(body.paging).toBeDefined()
         expect(body.paging.page).toBe(3)
         expect(body.paging.limit).toBe(1)
         expect(body.paging.total_results).toBe(3)
         expect(body.paging.max_page).toBe(3)
      })

      test('Should return two results per page when the limit is two', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 1, limit: 2 })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('data')
         expect(body.data).toBeDefined()
         expect(Array.isArray(body.data)).toBe(true)
         expect(body.data.length).toBe(2)
         expect(body).toHaveProperty('paging')
         expect(body.paging).toBeDefined()
         expect(body.paging.page).toBe(1)
         expect(body.paging.limit).toBe(2)
         expect(body.paging.total_results).toBe(3)
         expect(body.paging.max_page).toBe(2)
      })

      test('Should return all results when the limit is greater than the total', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 1, limit: 10 })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('data')
         expect(body.data).toBeDefined()
         expect(Array.isArray(body.data)).toBe(true)
         expect(body.data.length).toBe(3)
         expect(body).toHaveProperty('paging')
         expect(body.paging).toBeDefined()
         expect(body.paging.page).toBe(1)
         expect(body.paging.limit).toBe(10)
         expect(body.paging.total_results).toBe(3)
         expect(body.paging.max_page).toBe(1)
      })

      test('Should return an empty data array when the page is out of range', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 4, limit: 1 })

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('data')
         expect(body.data).toBeDefined()
         expect(Array.isArray(body.data)).toBe(true)
         expect(body.data.length).toBe(0)
         expect(body).toHaveProperty('paging')
         expect(body.paging).toBeDefined()
         expect(body.paging.page).toBe(4)
         expect(body.paging.limit).toBe(1)
         expect(body.paging.total_results).toBe(3)
         expect(body.paging.max_page).toBe(3)
      })
   })

   describe('Invalid Pagination', () => {

      test('Should return 400 invalid_params if page is zero', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 0, limit: 1 })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })

      test('Should return 400 invalid_params if page is negative', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: -1, limit: 1 })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })

      test('Should return 400 invalid_params if limit is zero', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 1, limit: 0 })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })

      test('Should return 400 invalid_params if limit is negative', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 1, limit: -1 })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })

      test('Should return 400 invalid_params if page is not a number', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 'abc', limit: 1 })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })

      test('Should return 400 invalid_params if limit is not a number', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 1, limit: 'abc' })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })

      test('Should return 400 invalid_params if page is a fraction', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 1.5, limit: 1 })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })

      test('Should return 400 invalid_params if limit is a fraction', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'j', page: 1, limit: 1.5 })

         expect(statusCode).toBe(400)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('invalid_params')
      })
   })

   describe('Follow Relationships', () => {
      test('Should return followed false and follower false when the authenticated user has no relationship', async () => {
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'janedoe' })
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body.data[0]).toHaveProperty('followed')
         expect(body.data[0].followed).toBeDefined()
         expect(body.data[0].followed).toBe(false)
         expect(body.data[0]).toHaveProperty('follower')
         expect(body.data[0].follower).toBeDefined()
         expect(body.data[0].follower).toBe(false)
      })

      test('Should return followed true when the authenticated user follows the searched user', async () => {
         await followUser(user.username, otherUser.username)
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'janedoe' })
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body.data[0]).toHaveProperty('followed')
         expect(body.data[0].followed).toBeDefined()
         expect(body.data[0].followed).toBe(true)
         expect(body.data[0]).toHaveProperty('follower')
         expect(body.data[0].follower).toBeDefined()
         expect(body.data[0].follower).toBe(false)
      })

      test('Should return follower true when the searched user follows the authenticated user', async () => {
         await followUser(otherUser.username, user.username)
         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'janedoe' })
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(200)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body.data[0]).toHaveProperty('followed')
         expect(body.data[0].followed).toBeDefined()
         expect(body.data[0].followed).toBe(false)
         expect(body.data[0]).toHaveProperty('follower')
         expect(body.data[0].follower).toBeDefined()
         expect(body.data[0].follower).toBe(true)
      })
   })

   describe('Authentication', () => {
      test('Should return 401 if the access token is invalid', async () => {
         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'janedoe' })
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
            .get(`${URL}/search`)
            .query({ q: 'janedoe' })
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
            .get(`${URL}/search`)
            .query({ q: 'janedoe' })
            .set('Authorization', `Bearer ${token}`)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'janedoe' })
            .set('Authorization', `Bearer ${token}`)

         expect(statusCode).toBe(401)
         expect(body).toBeDefined()
         expect(body).toBeInstanceOf(Object)
         expect(body).toHaveProperty('error_name')
         expect(body).toHaveProperty('message')
         expect(body.error_name).toBe('token_already_used')
      })
   })

   describe('Search Errors', () => {
      test('Should return 500 if the authenticated user profile was deleted', async () => {
         const dbUser = await UserModel.findOne({ username: user.username })

         if (!dbUser) throw new Error('User not found')

         await ProfileModel.deleteMany({ user_uuid: dbUser.uuid })

         const token = await getAccessToken(user.username)

         const { statusCode, body } = await server.fetch
            .get(`${URL}/search`)
            .query({ q: 'janedoe' })
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
