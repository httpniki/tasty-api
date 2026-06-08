import type User from './user'

interface PostType {
   uuid: string
   content: string
   create_at: string
   user: User,
   type?: 'post' | 'repost'
}

export default class Post {
   private readonly uuid: string
   private content: string
   private create_at: string
   private type: 'post' | 'repost'
   private user: User

   constructor(post: PostType) {
      this.uuid = post.uuid
      this.content = post.content
      this.create_at = post.create_at
      this.user = post.user
      this.type = post.type
   }

   public set setType(type: 'post' | 'repost') { this.type = type }
   public set setContent(content: string) { this.content = content }
   public set setCreateAt(create_at: string) { this.create_at = create_at }
   public set setUser(user: User) { this.user = user }
   public get getType() { return this.type }
   public get getContent() { return this.content }
   public get getCreateAt() { return this.create_at }
   public get getUser() { return this.user }
   public get getUUID() { return this.uuid }
}
