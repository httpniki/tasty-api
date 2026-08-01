import type { NextFunction, Request, Response } from 'express'

import ImageService from '@/images/image.service'
import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import ProfileService from '@/user/services/profile.service'
import UserService from '@/user/services/user.service'

import PostDTO from '../dto/post'
import UserDTO from '../dto/user'
import PostServiceException from '../errors/PostServiceException'
import PostService from '../services/post.service'

interface RequestBody {
   content: string
}

export default class CreatePostController {
   private readonly req: Request
   private readonly res: Response
   private readonly next: NextFunction
   private readonly postService = new PostService()
   private readonly userService = new UserService()
   private readonly imageService = new ImageService()
   private readonly profileService = new ProfileService()

   constructor(req: Request<any, any, RequestBody>, res: Response, next: NextFunction) {
      this.req = req
      this.res = res
      this.next = next
      this.execute()
   }

   async execute() {
      const { content } = this.req.body

      if (!this.req.session) return this.next(new Error('Authenticated session not found'))
      const { user_uuid } = this.req.session
      const files = this.req.files

      let post: Awaited<ReturnType<PostService['createPost']>>
      let user: Awaited<ReturnType<UserService['findUser']>>
      let profile: Awaited<ReturnType<ProfileService['findProfile']>>

      try {
         profile = await this.profileService.findProfile({ user_uuid })
         user = await this.userService.findUser({ uuid: user_uuid })
      } catch (error: unknown) {
         return this.next(error)
      }

      const imagesIDs: string[] = []

      try {
         if (files && 'images' in files) {
            for (const file of files.images) {
               const saved = await this.imageService.saveImage(file)
               const uuid = saved.name.split('.')[0]
               imagesIDs.push(uuid)
            }
         }
      } catch (err: unknown) {
         return this.next(err)
      }

      try {
         post = await this.postService.createPost({
            user_uuid,
            content,
            images: imagesIDs
         })
      } catch (error: unknown) {
         if (!(error instanceof PostServiceException)) return this.next(error)

         if (error.name === 'post_validation_error') {
            const exception = ExceptionFactory.invalidInput(error.message, error.data)
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      profile.posts.push({ uuid: post.uuid, type: 'post', created_at: post.created_at })

      try {
         await this.profileService.updateProfile(user_uuid, { posts: profile.posts })
      } catch (error: unknown) {
         return this.next(error)
      }

      const postDTO = new PostDTO({
         uuid: post.uuid,
         content: post.content,
         created_at: post.created_at.toString(),
         type: 'post',
         images: post.images,
         user: new UserDTO({
            uuid: user_uuid,
            username: user.username,
            name: profile.name,
            avatar: profile.avatar,
            header: profile.header,
            followers: profile.followers.length,
            follows: profile.follows.length,
            posts: profile.posts.length
         })
      })

      return this.res.status(201).json(postDTO)
   }
}
