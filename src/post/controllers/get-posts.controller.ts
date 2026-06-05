import type { NextFunction, Request, Response } from 'express'
import { type ParamsDictionary } from 'express-serve-static-core'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import PaginatedResponse, { Paging } from '@/shared/response/http/PaginatedResponse'
import UserService, { type User as UserType } from '@/user/services/user.service'

import Post from '../dto/post'
import User from '../dto/user'
import PostService from '../services/post.service'

interface QueryParams {
   user?: string
   follows?: boolean
   page?: number
   limit?: number
}

export default class GetPostsController {
   private readonly req: Request<ParamsDictionary, any, any, QueryParams>
   private readonly res: Response
   private readonly next: NextFunction
   private readonly postService = new PostService()
   private readonly userService = new UserService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req
      this.res = res
      this.next = next
      this.execute()
   }

   // ?user_uuid=5f81c3d7c4b0d1d4d0e0f1f2 return all posts of user
   // ?follows=true return posts of user follows
   private async execute() {
      const { user: user_uuid, page = 1, limit = 20 } = this.req.query
      let posts: Post[] = []
      let user: UserType | null = null
      let totalResults = 0
      let maxPage = 1

      if (user_uuid) {
         user = await this.userService.findUser({ uuid: user_uuid })

         if (!user) {
            const exception = ExceptionFactory.notFound('User not found')
            return this.res.status(exception.status).json(exception.toJSON())
         }
      }

      try {
         const results = await this.postService.findPosts({ user_uuid, page, limit })
         totalResults = results.paging.total_results
         maxPage = results.paging.max_page

         const postsPromise = results.posts.map(async (post) => {
            const user = await this.userService.findUser({ _id: post.user.toString() })

            const newPost = new Post({
               uuid: post.uuid,
               content: post.content,
               create_at: post.create_at.toString(),
               user: new User({
                  uuid: user.uuid,
                  email: user.email,
                  username: user.username,
                  description: user.description,
                  name: user.name,
                  avatar: user.avatar,
                  header: user.header,
                  followers: user.followers.length,
                  follows: user.follows.length,
                  posts: user.posts.length
               })
            })

            return newPost
         })

         posts = await Promise.all(postsPromise)
      } catch (error) {
         return this.next(error)
      }

      const paging: Paging = new Paging({ page, limit, total_results: totalResults, max_page: maxPage })
      const response = new PaginatedResponse<Post>(posts, paging)
      return this.res.status(200).json(response)
   }
}
