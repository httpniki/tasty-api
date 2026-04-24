import type { NextFunction, Request, Response } from 'express'

import { Auth } from '@/auth/auth.decorator'

import CheckAvailabilityController from './controllers/check-availability.controller'
import FollowUserController from './controllers/follow-user.controller'
import GetProfileController from './controllers/get-profile.controller'
import RegisterController from './controllers/register.controller'
import SearchUsersController from './controllers/search-users.controller'
import UnfollowUserController from './controllers/unfollow-user.controller'
import UpdateProfileController from './controllers/update-profile.controller'

export default class UserController {
   register(req: Request, res: Response, next: NextFunction) {
      return new RegisterController(req, res, next)
   }

   checkAvailability(req: Request, res: Response, next: NextFunction) {
      return new CheckAvailabilityController(req, res, next)
   }

   @Auth.consumeAccess({ required: false })
   async searchUsers(req: Request, res: Response, next: NextFunction) {
      return new SearchUsersController(req, res, next)
   }

   @Auth.consumeAccess({ required: false })
   async getProfile(req: Request, res: Response, next: NextFunction) {
      return new GetProfileController(req, res, next)
   }

   @Auth.consumeAccess()
   async followUser(req: Request, res: Response, next: NextFunction) {
      return new FollowUserController(req, res, next)
   }

   @Auth.consumeAccess()
   async unfollowUser(req: Request, res: Response, next: NextFunction) {
      return new UnfollowUserController(req, res, next)
   }

   @Auth.consumeAccess()
   async updateProfile(req: Request, res: Response, next: NextFunction) {
      return new UpdateProfileController(req, res, next)
   }
}
