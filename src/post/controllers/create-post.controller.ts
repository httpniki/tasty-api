import type { NextFunction, Request, Response } from 'express'

import ImageService from '@/images/image.service'
import UserService, { type User } from '@/user/services/user.service'

import PostDTO from '../dto/post'
import UserDTO from '../dto/user'
import PostService, { type Post } from '../services/post.service'

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

   constructor(req: Request<any, any, RequestBody>, res: Response, next: NextFunction) {
      this.req = req
      this.res = res
      this.next = next
      this.execute()
   }

   async execute() {
      const { content } = this.req.body

      if (!this.req.session) return this.next(new Error('Session not found'))
      const { user_id, user_uuid } = this.req.session
      const files = this.req.files

      const imageUuids: string[] = []

      if (files && 'images' in files) {
         for (const file of files.images) {
            const saved = await this.imageService.saveImage(file)
            const uuid = saved.name.split('.')[0]
            imageUuids.push(uuid)
         }
      }

      let post: Post
      let user: User

      try {
         user = await this.userService.findUser({ _id: user_id })
         if (!user) throw Error('User not found in database on create post')
      } catch (error) {
         return this.next(error)
      }

      try {
         post = await this.postService.createPost({
            user_uuid,
            content,
            user: user_id,
            images: imageUuids,
         })
      } catch (error) {
         return this.next(error)
      }

      user.posts.push({ uuid: post.uuid, type: 'post', created_at: post.create_at })

      try {
         await this.userService.updateUser(user._id.toString(), { posts: user.posts })
      } catch (error) {
         return this.next(error)
      }

      const postDTO = new PostDTO({
         uuid: post.uuid,
         content: post.content,
         create_at: post.create_at.toString(),
         type: 'post',
         images: post.images,
         user: new UserDTO({
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

      return this.res.status(201).json(postDTO)
   }
}
