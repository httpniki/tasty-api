import { BaseRouter } from '../shared/router/router'
import UserController from './user.controller'
import UserMiddleware from './user.middleware'

export default class UserRouter extends BaseRouter<UserMiddleware, UserController> {
   constructor() {
      super(UserMiddleware, UserController)
   }

   routes(): void {
      this.router.post(
         '/user/register',
         this.middleware.processFiles([
            { name: 'avatar', maxCount: 1 },
            { name: 'header', maxCount: 1 },
         ]),
         this.controller.register
      )

      this.router.put(
         '/user/profile',
         this.middleware.processFiles([
            { name: 'avatar', maxCount: 1 },
            { name: 'header', maxCount: 1 },
         ]),
         this.controller.updateProfile
      )

      this.router.get('/user/me', this.controller.getCurrentUser)
      this.router.post('/user/check-availability', this.controller.checkAvailability)
      this.router.get('/user/search', this.controller.searchUsers)
      this.router.get('/user/:username', this.controller.getProfile)
      this.router.post('/user/:username/follow', this.controller.followUser)
      this.router.post('/user/:username/unfollow', this.controller.unfollowUser)
   }
}
