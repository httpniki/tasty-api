import { BaseRouter } from '../shared/router/router'
import PostController from './post.controller'
import PostMiddleware from './post.middleware'

export default class PostRouter extends BaseRouter<PostMiddleware, PostController> {
   constructor() {
      super(PostMiddleware, PostController)
   }

   routes(): void {
      this.router.get('/posts/:post_uuid', this.controller.getPost)
      this.router.get('/posts', this.controller.getPosts)

      this.router.post('/posts', this.controller.createPost)

      this.router.delete('/posts/:post_uuid', this.controller.deletePost)
   }
}
