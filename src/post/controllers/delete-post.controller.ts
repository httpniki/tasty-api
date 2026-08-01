import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import ProfileService from '@/user/services/profile.service'

import PostServiceException from '../errors/PostServiceException'
import PostService from '../services/post.service'

interface Params {
   post_uuid: string
}

export default class DeletePostController {
   private readonly req: Request<Params>
   private readonly res: Response
   private readonly next: NextFunction
   private readonly postService = new PostService()
   private readonly profileService = new ProfileService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as unknown as Request<Params>
      this.res = res
      this.next = next
      this.execute()
   }

   async execute() {
      const { post_uuid } = this.req.params

      if (!post_uuid) {
         const exception = ExceptionFactory.paramNotFound('post_uuid')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (!this.req.session) return this.next(new Error('Session not found'))

      const { user_uuid } = this.req.session
      let post: Awaited<ReturnType<PostService['findPost']>>

      try {
         post = await this.postService.findPost({ uuid: post_uuid })
      } catch (error: unknown) {
         if (error instanceof PostServiceException && error.name === 'post_not_found') {
            const exception = ExceptionFactory.notFound(error.message)
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      if (user_uuid !== post.user_uuid) {
         const exception = ExceptionFactory.unauthorized('You are not the owner of this post')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      try {
         await this.postService.deletePost(post_uuid)
         const profile = await this.profileService.findProfile({ user_uuid: post.user_uuid })

         await this.profileService.updateProfile(post.user_uuid, {
            posts: profile.posts.filter((p) => p.uuid !== post_uuid)
         })
      } catch (error: unknown) {
         return this.next(error)
      }

      return this.res.status(200).json()
   }
}
