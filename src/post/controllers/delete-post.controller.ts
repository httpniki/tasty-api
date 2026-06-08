import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import UserService, { type User } from '@/user/services/user.service'

import PostService, { type Post } from '../services/post.service'

interface Params {
   post_uuid: string
}

export default class DeletePostController {
   private readonly req: Request<Params, any, any, any>
   private readonly res: Response
   private readonly next: NextFunction
   private readonly postService = new PostService()
   private readonly userService = new UserService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as unknown as Request<Params, any, any, any>
      this.res = res
      this.next = next
      this.execute()
   }

   async execute() {
      const { post_uuid } = this.req.params
      let user: User | null = null
      let post: Post | null = null

      if (!post_uuid) {
         const exception = ExceptionFactory.paramNotFound('post_uuid not found')
         return this.res.status(exception.status).json(exception.message)
      }

      if(!this.req.session) return this.next(new Error('Session not found'))

      try {
         post = await this.postService.findPost({ uuid: post_uuid })
         user = await this.userService.findUser({ uuid: this.req.session.user_uuid })

         if (!post) {
            const exception = ExceptionFactory.notFound('post not found')
            return this.res.status(exception.status).json(exception.message)
         }

         if (!user) throw new Error('User not found while deleting a post')
      } catch (error) {
         return this.next(error)
      }

      if (user.uuid !== post.user_uuid) {
         const exception = ExceptionFactory.unauthorized('You are not the owner of this post')
         return this.res.status(exception.status).json(exception.message)
      }

      try {
         await this.postService.deletePost(post_uuid)
         await this.userService.updateUser(user._id.toString(), { posts: user.posts.filter(el => el.uuid !== post_uuid) })
      } catch (error) {
         return this.next(error)
      }

      return this.res.status(200).json()
   }
}
