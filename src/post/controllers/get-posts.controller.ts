import type { NextFunction, Request, Response } from 'express'
import { type ParamsDictionary } from 'express-serve-static-core'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import PaginatedResponse, { Paging } from '@/shared/response/http/PaginatedResponse'
import ProfileService from '@/user/services/profile.service'
import UserService from '@/user/services/user.service'

import Post from '../dto/post'
import User from '../dto/user'
import PostServiceException from '../errors/PostServiceException'
import PostService from '../services/post.service'

interface QueryParams {
   user?: string
   page?: string
   limit?: string
}

export default class GetPostsController {
   private readonly req: Request<ParamsDictionary, any, any, QueryParams>
   private readonly res: Response
   private readonly next: NextFunction
   private readonly postService = new PostService()
   private readonly userService = new UserService()
   private readonly profileService = new ProfileService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req
      this.res = res
      this.next = next
      this.execute()
   }

   private async execute() {
      const user_uuid = this.req.query.user
      const page = parseInt(this.req.query.page ?? '1')
      const limit = parseInt(this.req.query.limit ?? '20')
      let posts: Post[] = []
      let totalResults = 0
      let maxPage = 1

      if (isNaN(page) || isNaN(limit)) {
         const exception = ExceptionFactory.invalidParam('page and limit must be numbers')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (page < 1 || limit < 1) {
         const exception = ExceptionFactory.invalidParam('page and limit must be greater than 0')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      try {
         const results = user_uuid
            ? await this.postService.findPosts({ user_uuid }, { page, limit })
            : await this.postService.findPosts(undefined, { page, limit })

         totalResults = results.paging.total_results
         maxPage = results.paging.max_page

         const postsPromise = results.posts.map(async (post) => this.transformPostToDTO(post))
         posts = await Promise.all(postsPromise)
      } catch (error: unknown) {
         if (error instanceof PostServiceException && error.name === 'user_not_found') {
            const exception = ExceptionFactory.notFound('User not found')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      const paging: Paging = new Paging({ page, limit, total_results: totalResults, max_page: maxPage })
      const response = new PaginatedResponse<Post>(posts, paging)
      return this.res.status(200).json(response)
   }

   private async transformPostToDTO(post: Awaited<ReturnType<PostService['findPosts']>>['posts'][number]): Promise<Post> {
      const [user, profile] = await Promise.all([
         this.userService.findUser({ uuid: post.user_uuid }),
         this.profileService.findProfile({ user_uuid: post.user_uuid })
      ])

      const newPost = new Post({
         uuid: post.uuid,
         content: post.content,
         created_at: post.created_at.toString(),
         images: post.images,
         user: new User({
            uuid: user.uuid,
            username: user.username,
            name: profile.name,
            avatar: profile.avatar,
            header: profile.header,
            followers: profile.followers.length,
            follows: profile.follows.length,
            posts: profile.posts.length
         })
      })

      if('type' in post) newPost.setType = post.type as 'post' | 'repost'
      if('reposted_at' in post) newPost.setRepostedAt = (post.reposted_at as Date).toString()

      return newPost
   }
}
