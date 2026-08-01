import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import PaginatedResponse, { Paging } from '@/shared/response/http/PaginatedResponse'

import SearchUser from '../dto/search-user'
import ProfileService from '../services/profile.service'
import UserService from '../services/user.service'

interface QueryParams {
   q?: string
   page?: number
   limit?: number
}

export default class SearchUsersController {
   private req: Request<any, any, any, QueryParams>
   private res: Response
   private next: NextFunction
   private readonly userService = new UserService()
   private readonly profileService = new ProfileService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      const { q: query, page = 1, limit = 20 } = this.req.query
      let currentProfile: Awaited<ReturnType<ProfileService['findProfile']>> | null = null
      let paging: Awaited<ReturnType<UserService['findUsers']>>['paging']
      let results: Awaited<ReturnType<UserService['findUsers']>>['users'] = []

      if (!query || typeof query !== 'string') {
         const exception = ExceptionFactory.invalidParam('Query parameter "q" is required')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (this.req.session) {
         try {
            currentProfile = await this.profileService.findProfile({ user_uuid: this.req.session.user_uuid })
         } catch (error) {
            return this.next(error)
         }
      }

      try {
         const { paging: p, users: u } = await this.userService.findUsers(new RegExp(query, 'i'), page, limit)
         results = u
         paging = p
      } catch (error) {
         return this.next(error)
      }

      let dto: SearchUser[]

      try {
         dto = await Promise.all(results.map(async (u) => {
            const profile = await this.profileService.findProfile({ user_uuid: u.uuid })

            const isFollowed = currentProfile ? currentProfile.follows.includes(u.uuid) : false
            const isFollower = currentProfile ? currentProfile.followers.includes(u.uuid) : false

            return new SearchUser({
               avatar: profile.avatar,
               username: u.username,
               name: profile.name,
               followed: isFollowed,
               follower: isFollower,
               uuid: u.uuid
            })
         }))
      } catch (error) {
         return this.next(error)
      }

      const pagingDTO = new Paging({
         page,
         limit,
         total_results: paging.total_results,
         max_page: paging.max_page
      })

      const responseDTO = new PaginatedResponse(dto, pagingDTO)

      return this.res.status(200).json(responseDTO)
   }
}
