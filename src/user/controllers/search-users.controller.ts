import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import PaginatedResponse, { Paging } from '@/shared/response/http/PaginatedResponse'

import SearchUsers from '../dto/search-users'
import UserService, { type User } from '../services/user.service'

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

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req
      this.res = res
      this.next = next

      this.execute()
   }

   async execute() {
      const { q: query, page = 1, limit = 20 } = this.req.query
      let currentUser: User | null = null
      let searchResults: Awaited<ReturnType<typeof this.userService.findUsers>> | null = null

      if (!query || typeof query !== 'string') {
         const exception = ExceptionFactory.invalidParam('Query parameter "q" is required')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (this.req.session) {
         try {
            currentUser = await this.userService.findUser({ _id: this.req.session.user_id })
         } catch (error) {
            return this.next(error)
         }
      }

      try {
         searchResults = await this.userService.findUsers(query, page, limit)
      } catch (error) {
         return this.next(error)
      }

      const users = searchResults.users.map((user) => {
         const isFollowed = currentUser ? currentUser.follows.includes(user.uuid) : false
         const isFollower = currentUser ? currentUser.followers.includes(user.uuid) : false

         return new SearchUsers({
            avatar: user.avatar,
            username: user.username,
            name: user.name,
            followed: isFollowed,
            follower: isFollower
         })
      })

      const paging = new Paging({
         page,
         limit,
         total_results: searchResults.paging.total_results,
         max_page: searchResults.paging.max_page
      })

      const response = new PaginatedResponse(users, paging)
      return this.res.status(200).json(response)
   }
}
