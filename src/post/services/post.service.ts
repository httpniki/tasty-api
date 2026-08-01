import crypto from 'crypto'
import { Error as MongooseError } from 'mongoose'

import ProfileModel from '@/user/models/profile.model'

import { PostServiceExceptionFactory } from '../errors/PostServiceException'
import PostModel, { type IPost } from '../models/post.model'

type Post = Pick<IPost, 'uuid' | 'content' | 'created_at' | 'user_uuid' | 'images'>

interface Paging {
   page: number
   limit: number
   total_results: number
   max_page: number
}

interface PostsWithPaging {
   posts: Post[]
   paging: Paging
}

interface FindPostsArgs {
   user_uuid?: string
}

interface NewPost {
   content: Post['content']
   user_uuid: Post['user_uuid']
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

   async findPosts(params?: FindPostsArgs, paging?: Partial<Paging>): Promise<PostsWithPaging> {
      const { page = 1, limit = 20 } = paging ?? {}
      const { user_uuid } = params ?? {}

      if (!user_uuid) {
         const [results, totalResults] = await Promise.all([
            PostModel
               .find()
               .select(this.post_projection)
               .sort({ created_at: -1 })
               .skip((page - 1) * limit)
               .limit(limit),
            PostModel.countDocuments()
         ])

         return {
            posts: results.map((p) => {
               // eslint-disable-next-line @typescript-eslint/no-unused-vars
               const { user, _id, ...rest } = p.toJSON()
               return rest
            }),
            paging: {
               page,
               limit,
               total_results: totalResults,
               max_page: Math.ceil(totalResults / limit)
            }
         }
      }

      const profile = await ProfileModel
         .findOne()
         .where({ user_uuid })
         .select('posts')

      if (!profile) throw PostServiceExceptionFactory.userNotFound({ user_uuid })

      const findPost = async (post_uuid: string) => {
         const post = await PostModel
            .findOne()
            .where({ uuid: post_uuid })
            .select(this.post_projection)

         if (!post) throw PostServiceExceptionFactory.unexpectedError('Post not found', { post_uuid })

         return post.toJSON()
      }

      const results = await Promise.all(
         profile
            .posts
            .reverse()
            .slice((page - 1) * limit, limit)
            .map(async (p) => {
               // eslint-disable-next-line @typescript-eslint/no-unused-vars
               const { user, _id, ...rest } = await findPost(p.uuid)

               return {
                  type: p.type,
                  reposted_at: p.reposted_at,
                  ...rest
               }
            })
      )

      return {
         posts: results,
         paging: {
            page,
            limit,
            total_results: profile.posts.length,
            max_page: Math.ceil(profile.posts.length / limit)
         }
      }
   }

   async findPost({ uuid }: { uuid: string }): Promise<Post> {
      const post = await PostModel.findOne()
         .where({ uuid })
         .select(this.post_projection)

      if (!post) throw PostServiceExceptionFactory.postNotFound({ uuid })

      return {
         uuid: post.uuid,
         content: post.content,
         created_at: post.created_at,
         images: post.images,
         user_uuid: post.user_uuid,
      }
   }

   async createPost(data: NewPost): Promise<Post> {
      const postModel = new PostModel({
         user_uuid: data.user_uuid,
         content: data.content,
         uuid: crypto.randomBytes(16).toString('hex'),
         created_at: Date.now(),
         images: data.images ?? []
      })

      const err = await postModel.validate()
         .catch((err: MongooseError.ValidationError) => {
            const validationErr = Object.values(err.errors).find(error => error instanceof MongooseError.ValidatorError)
            if (validationErr) return validationErr

            const castError = Object.values(err.errors).find(error => error instanceof MongooseError.CastError)
            return castError
         })

      if (err instanceof MongooseError.ValidatorError) throw PostServiceExceptionFactory.validationError(err.message, { [err.path]: err.message })
      if (err instanceof MongooseError.CastError) throw err

      return await postModel
         .save()
         .then((post) => ({
            uuid: post.uuid,
            content: post.content,
            created_at: post.created_at,
            images: post.images,
            user_uuid: post.user_uuid
         }))
   }

   async deletePost(uuid: string): Promise<Post> {
      const result = await PostModel.findOne({ uuid })
      if (!result) throw PostServiceExceptionFactory.postNotFound({ uuid })

      const post = result.toJSON()

      await PostModel.deleteOne({ uuid: post.uuid })

      return {
         uuid: post.uuid,
         content: post.content,
         created_at: post.created_at,
         images: post.images,
         user_uuid: post.user_uuid,
      }
   }

   async repost(post_uuid: string, user_uuid: string): Promise<Post> {
      const post = await PostModel.findOne({ uuid: post_uuid })
      const profile = await ProfileModel.findOne().where({ user_uuid })

      if (!post) throw PostServiceExceptionFactory.postNotFound({ post_uuid })
      if (!profile) throw PostServiceExceptionFactory.userNotFound({ user_uuid })

      const isAlreadyReposted = profile.posts.some((p) => p.uuid === post_uuid && p.type === 'repost')

      if (isAlreadyReposted) throw PostServiceExceptionFactory.validationError('Post already reposted', { post_uuid })

      const updatedPosts = [...profile.posts, { uuid: post_uuid, type: 'repost', reposted_at: new Date().toString() }]

      await ProfileModel
         .updateOne({ runValidators: true })
         .where({ user_uuid })
         .set({ posts: updatedPosts })

      return {
         uuid: post.uuid,
         content: post.content,
         created_at: post.created_at,
         images: post.images,
         user_uuid: post.user_uuid,
      }
   }

   async deleteRepost(post_uuid: string, user_uuid: string): Promise<Post> {
      const post = await PostModel.findOne({ uuid: post_uuid })

      if (!post) throw PostServiceExceptionFactory.postNotFound({ post_uuid: post_uuid })

      const profile = await ProfileModel
         .findOne()
         .where({ user_uuid })
         .select({ posts: true })

      if (!profile) throw PostServiceExceptionFactory.userNotFound({ user_uuid })

      const isNotReposted = profile.posts.some((p) => p.uuid === post_uuid && p.type === 'repost')

      if (!isNotReposted) throw PostServiceExceptionFactory.validationError('Post is not reposted', { post_uuid })

      const updatedPosts = profile.posts.filter((p) => p.uuid !== post_uuid)

      await ProfileModel
         .updateOne({ runValidators: true })
         .where({ user_uuid })
         .set({ posts: updatedPosts })

      return {
         uuid: post.uuid,
         content: post.content,
         created_at: post.created_at,
         images: post.images,
         user_uuid: post.user_uuid,
      }
   }
}
