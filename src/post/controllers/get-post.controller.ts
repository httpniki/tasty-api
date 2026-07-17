import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import UserService, { type User as UserType } from '@/user/services/user.service'

import Post from '../dto/post'
import User from '../dto/user'
import PostService, { type Post as PostType } from '../services/post.service'

export default class GetPostController {
   private req: Request<{ post_uuid: string }>
   private res: Response
   private next: NextFunction
   private readonly postService = new PostService()
   private readonly userService = new UserService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as Request<{ post_uuid: string }>
      this.res = res
      this.next = next
      this.execute()
   }

   private async execute() {
      const { post_uuid } = this.req.params
      let post: PostType | null = null
      let user: UserType | null = null

      try {
         post = await this.postService.findPost({ uuid: post_uuid })
      } catch (error) {
         return this.next(error)
      }

      if (!post) {
         const exception = ExceptionFactory.notFound('Post not found')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      try {
         user = await this.userService.findUser({ _id: post.user.toString() })
      } catch (error) {
         return this.next(error)
      }

      if (!user) {
         const exception = new Error('Post owner not found')
         return this.next(exception)
      }

      const dto = new Post({
         uuid: post.uuid,
         content: post.content,
         created_at: post.created_at.toString(),
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

      return this.res.status(200).json(dto)
   }
}
