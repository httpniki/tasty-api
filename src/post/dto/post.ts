import type User from './user'

interface PostType {
   uuid: string
   content: string
   created_at: string
   user: User,
   type?: 'post' | 'repost'
   reposted_at?: string
   images: string[]
}

export default class Post {
   private readonly uuid: string
   private content: string
   private created_at: string
   private type: 'post' | 'repost' = 'post'
   private user: User
   private reposted_at?: string
   private images: string[]

   constructor(post: PostType) {
      this.uuid = post.uuid
      this.content = post.content
      this.created_at = post.created_at
      this.user = post.user
      this.type = post.type
      this.reposted_at = post.reposted_at
      this.images = post.images
   }

   public set setType(type: 'post' | 'repost') { this.type = type }
   public set setContent(content: string) { this.content = content }
   public set setCreatedAt(created_at: string) { this.created_at = created_at }
   get getRepostedAt() { return this.reposted_at }
   public set setUser(user: User) { this.user = user }
   public get getType() { return this.type }
   public get getContent() { return this.content }
   public get getCreatedAt() { return this.created_at }
   public set setRepostedAt(reposted_at: string) { this.reposted_at = reposted_at }
   public get getUser() { return this.user }
   public get getUUID() { return this.uuid }
   public get getImages() { return this.images }
}
