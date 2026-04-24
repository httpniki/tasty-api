import type { NextFunction, Request, Response } from 'express'

import { Auth } from '../auth/auth.decorator'
import CreatePostController from './controllers/create-post.controller'
import DeletePostController from './controllers/delete-post.controller'
import GetPostController from './controllers/get-post.controller'
import GetPostsController from './controllers/get-posts.controller'

export default class PostController {
   async getPost(req: Request, res: Response, next: NextFunction) {
      return new GetPostController(req, res, next)
   }

   async getPosts(req: Request, res: Response, next: NextFunction) {
      return new GetPostsController(req, res, next)
   }

   @Auth.consumeAccess()
   async createPost(req: Request, res: Response, next: NextFunction) {
      return new CreatePostController(req, res, next)
   }

   @Auth.consumeAccess()
   async deletePost(req: Request, res: Response, next: NextFunction) {
      return new DeletePostController(req, res, next)
   }
}
