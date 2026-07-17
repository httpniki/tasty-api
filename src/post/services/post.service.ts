import crypto from 'crypto'

import ServiceError, { ServiceErrorName } from '@/shared/errors/ServiceError'
import UserModel from '@/user/models/user.model'

import PostModel from '../models/post.model'
import { type IPost } from '../types/types'

export type Post = Pick<IPost, 'uuid' | 'content' | 'created_at' | 'user_uuid' | 'user' | 'images'>
export type UserPost = Pick<IPost, 'uuid' | 'content' | 'created_at' | 'user_uuid' | 'user' | 'images'> & { type: 'post' | 'repost', reposted_at?: Date }

interface Paging {
   page: number
   limit: number
   total_results: number
   max_page: number
}

type FindPostsArguments = {
   [K in keyof Pick<Paging, 'page' | 'limit'>]: Paging[K]
}

type FindUserPostPaging = { [K in keyof Pick<Paging, 'page' | 'limit'>]: Paging[K] }

interface FindUserPostsConditions {
   user_uuid?: string
}

interface PostsWithPaging<T = Post | UserPost> {
   posts: T[]
   paging: {
      page: number
      limit: number
      max_page: number
      total_results: number
   }
}

interface NewPostArguments {
   user: Post['user'] | string
   user_uuid: Post['user_uuid']
   content: Post['content']
   images?: string[]
}

export default class PostService {
   private post_projection = {
      content: true,
      created_at: true,
      uuid: true,
      user: true,
      user_uuid: true,
      images: true,
   }

   /***
   * @throws user_not_found
   **/
   async findPosts(args?: FindPostsArguments): Promise<PostsWithPaging<Post>> {
      const { page = 1, limit = 20 } = args || {}

      let posts: Post[] = []
      let totalResults = 0

      const [results, total] = await Promise.all([
         await PostModel.find()
            .select(this.post_projection)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ created_at: -1 }),
         await PostModel.countDocuments()
      ])

      posts = results.map((post) => {
         const json = post.toJSON()
         return {
            type: 'post',
            ...json
         }
      })

      totalResults = total

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

   async findUserPosts(condition: FindUserPostsConditions, paging: FindUserPostPaging): Promise<PostsWithPaging<UserPost>> {
      const { user_uuid } = condition || {}
      const { page = 1, limit = 20 } = paging || {}

      let posts: UserPost[] = []
      let totalResults = 0

      if (user_uuid) {
         const user = await UserModel
            .findOne()
            .where({ uuid: user_uuid })
            .select('posts')

         if (!user) {
            const err = new Error('User not found')
            err.name = 'user_not_found'
            throw err
         }

         const results: UserPost[] = await Promise.all(
            user
               .posts
               .reverse()
               .slice((page - 1) * limit, limit)
               .map(async (p) => {
                  const result = await PostModel
                     .findOne()
                     .where({ uuid: p.uuid })
                     .select(this.post_projection)

                  const json = result.toJSON()

                  return {
                     type: p.type,
                     reposted_at: p.reposted_at,
                     ...json
                  }
               })
         )

         posts = results
         totalResults = user.posts.length
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
         created_at: Date.now(),
         images: data.images ?? []
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

   /**
      @throws post_not_found
      @throws user_not_found
      @throws post_already_reposted
   **/
   async repost(postUuid: string, userUuid: string): Promise<Post> {
      const post = await this.findPost({ uuid: postUuid })

      if (!post) {
         const err = new Error('Post not found')
         err.name = 'post_not_found'
         throw err
      }

      const user = await UserModel.findOne().where({ uuid: userUuid })

      if (!user) {
         const err = new Error('User not found')
         err.name = 'user_not_found'
         throw err
      }

      const alreadyReposted = user.posts.some((p) => p.uuid === postUuid && p.type === 'repost')

      if (alreadyReposted) {
         const err = new Error('Post already reposted')
         err.name = 'post_already_reposted'
         throw err
      }

      const updatedPosts = [...user.posts, { uuid: postUuid, type: 'repost', reposted_at: new Date().toString() }]

      await UserModel.findByIdAndUpdate(
         user._id,
         { $set: { posts: updatedPosts } },
         { runValidators: true }
      )

      return post
   }

   /**
      @throws post_not_found
      @throws user_not_found
      @throw post_not_reposted
   **/
   async deleteRepost(postUuid: string, userUuid: string) {
      const post = await this.findPost({ uuid: postUuid })

      if (!post) {
         const err = new Error('Post not found')
         err.name = 'post_not_found'
         throw err
      }

      const user = await UserModel
         .findOne()
         .where({ uuid: userUuid })
         .select({ posts: true, uuid: true })

      if (!user) {
         const err = new Error('User not found')
         err.name = 'user_not_found'
         throw err
      }

      const alreadyReposted = user.posts.some((p) => p.uuid === postUuid && p.type === 'repost')

      if (!alreadyReposted) {
         const err = new Error('Post is not reposted')
         err.name = 'post_not_reposted'
         throw err
      }

      const updatedPosts = user.posts.filter((p) => p.uuid !== postUuid)

      await UserModel.findByIdAndUpdate(
         user._id,
         { $set: { posts: updatedPosts } },
         { runValidators: true }
      )
   }
}
