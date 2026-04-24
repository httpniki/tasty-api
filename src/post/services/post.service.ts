import crypto from 'crypto'

import ServiceError, { ServiceErrorName } from '@/shared/errors/ServiceError'

import PostModel from '../models/post.model'
import { type IPost } from '../types/types'

export type Post = Pick<IPost, 'uuid' | 'content' | 'create_at' | 'user_uuid' | 'user'>

type FindPostsArguments = {
   page?: number
   limit?: number
   user_uuid?: string
}

interface PostsWithPaging {
   posts: Post[]
   paging: {
      page: number
      limit: number
      max_page: number
      total_results: number
   }
}

interface NewPostArguments {
   user: Post['user'] | string
   user_uuid: Post['user_uuid'],
   content: Post['content']
}

export default class PostService {
   private post_projection = {
      content: true,
      create_at: true,
      uuid: true,
      user: true,
      user_uuid: true,
   }

   /***
   * @throws ServiceError.DatabaseError
   **/
   async findPosts(args?: FindPostsArguments): Promise<PostsWithPaging> {
      const { page = 1, limit = 20, user_uuid } = args || {}
      const condition = user_uuid ? { user_uuid } : {}
      let posts: Post[] = []
      let totalResults = 0

      try {
         const [results, total] = await Promise.all([
            await PostModel.find()
               .where(user_uuid ? { user_uuid } : {})
               .select(this.post_projection)
               .skip((page - 1) * limit)
               .limit(limit)
               .sort({ create_at: -1 }),
            await PostModel.countDocuments(condition)
         ])

         posts = results.map((post) => post.toJSON())
         totalResults = total
      } catch (error: any) {
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }

      return {
         posts: posts,
         paging: {
            page,
            limit,
            total_results: totalResults,
            max_page: Math.ceil(totalResults / limit)
         }
      }
   }

   async findPost(args?: { uuid?: string }): Promise<Post | null> {
      const { uuid } = args || {}

      try {
         const post = await PostModel.findOne()
            .where({ uuid })
            .select(this.post_projection)

         if (!post) return null

         return post.toJSON() as Post
      } catch (error: any) {
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }
   }

   /***
      * @throws ServiceError.InvalidInput
      * @throws ServiceError.DatabaseError
   **/
   async createPost(data: NewPostArguments): Promise<Post> {
      const postModel = new PostModel({
         user_uuid: data.user_uuid,
         content: data.content,
         user: data.user,
         uuid: crypto.randomBytes(16).toString('hex'),
         create_at: Date.now()
      })

      const inputError = postModel.validateSync()
      if (inputError) throw new ServiceError(ServiceErrorName.InvalidInput, inputError.message, inputError)

      let post: Post

      try {
         const savedPost = await postModel.save()
         post = savedPost.toJSON()
      } catch (error) {
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }

      return post
   }

   /**
      @throws ServiceError.DatabaseError
   **/
   async deletePost(uuid: string) {
      try {
         await PostModel.findOneAndDelete({ uuid })
      } catch (error) {
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }
   }
}
