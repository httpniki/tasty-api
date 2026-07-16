import type { NextFunction, Request, Response } from 'express'
import { type ParamsDictionary } from 'express-serve-static-core'

import PaginatedResponse, { Paging } from '@/shared/response/http/PaginatedResponse'
import UserService from '@/user/services/user.service'

import Post from '../dto/post'
import User from '../dto/user'
import PostService, { type Post as PostType, type UserPost as UserPostType } from '../services/post.service'

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

   private async execute() {
      const { user: user_uuid, page = 1, limit = 20 } = this.req.query
      let posts: Post[] = []
      let totalResults = 0
      let maxPage = 1

      try {
         if (!user_uuid) {
            const results = await this.postService.findPosts({ page, limit })
            totalResults = results.paging.total_results
            maxPage = results.paging.max_page

            const postsPromise = results.posts.map(async (post) => this.transformPostToDTO(post))
            posts = await Promise.all(postsPromise)
         }

         if (user_uuid) {
            const results = await this.postService.findUserPosts({ user_uuid }, { page, limit })
            totalResults = results.paging.total_results
            maxPage = results.paging.max_page

            const postsPromise = results.posts.map(async (post) => this.transformPostToDTO(post))
            posts = await Promise.all(postsPromise)
         }
      } catch (error) {
         return this.next(error)
      }

      const paging: Paging = new Paging({ page, limit, total_results: totalResults, max_page: maxPage })
      const response = new PaginatedResponse<Post>(posts, paging)
      return this.res.status(200).json(response)
   }

   private async transformPostToDTO(post: PostType | UserPostType): Promise<Post> {
      const user = await this.userService.findUser({ _id: post.user.toString() })

      if (!user) throw new Error('User not found')

      const newPost = new Post({
         uuid: post.uuid,
         content: post.content,
         create_at: post.create_at.toString(),
         images: post.images,
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

      if('type' in post) newPost.setType = post.type
      if('reposted_at' in post) newPost.setRepostedAt = post.reposted_at.toString()

      return newPost
   }
}
