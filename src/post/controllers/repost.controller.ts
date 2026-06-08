import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import PostService from '../services/post.service'

interface Params { uuid: string }

export default class RepostController {
   private readonly req: Request<Params>
   private readonly res: Response
   private readonly next: NextFunction
   private readonly postService = new PostService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as unknown as Request<Params>
      this.res = res
      this.next = next
      this.execute()
   }

   private async execute() {
      const { uuid } = this.req.params
      const { user_uuid } = this.req.session

      if (!this.req.session) return this.next(new Error('Session not found'))

      try {
         await this.postService.repost(uuid, user_uuid)
      } catch (error: any) {
         if (error.name === 'post_not_found') {
            const exception = ExceptionFactory.notFound('Post not found')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         if (error.name === 'post_already_reposted') {
            const exception = ExceptionFactory.invalidParam('Post already reposted')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      return this.res.status(201).send()
   }
}
