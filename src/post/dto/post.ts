import type User from './user'

interface PostType {
   uuid: string
   content: string
   create_at: string
   user: User
}

export default class Post {
   readonly uuid: string
   readonly content: string
   readonly create_at: string
   readonly user: User

   constructor(post: PostType) {
      this.uuid = post.uuid
      this.content = post.content
      this.create_at = post.create_at
      this.user = post.user
   }
}
