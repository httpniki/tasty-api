import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import ProfileService from '@/user/services/profile.service'
import UserService from '@/user/services/user.service'

import Post from '../dto/post'
import User from '../dto/user'
import PostServiceException from '../errors/PostServiceException'
import PostService from '../services/post.service'

export default class GetPostController {
   private req: Request<{ post_uuid: string }>
   private res: Response
   private next: NextFunction
   private readonly postService = new PostService()
   private readonly userService = new UserService()
   private readonly profileService = new ProfileService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as Request<{ post_uuid: string }>
      this.res = res
      this.next = next
      this.execute()
   }

   private async execute() {
      const { post_uuid } = this.req.params
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

      let user: Awaited<ReturnType<UserService['findUser']>>
      let profile: Awaited<ReturnType<ProfileService['findProfile']>>

      try {
         [user, profile] = await Promise.all([
            this.userService.findUser({ uuid: post.user_uuid }),
            this.profileService.findProfile({ user_uuid: post.user_uuid })
         ])
      } catch (error: unknown) {
         return this.next(error)
      }

      const dto = new Post({
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

      return this.res.status(200).json(dto)
   }
}
