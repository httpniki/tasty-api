import type User from './user'

interface PostType {
   uuid: string
   content: string
   create_at: string
   user: User,
   type?: 'post' | 'repost'
   reposted_at?: string
}

export default class Post {
   private readonly uuid: string
   private content: string
   private create_at: string
   private type: 'post' | 'repost' = 'post'
   private user: User
   private reposted_at?: string

   constructor(post: PostType) {
      this.uuid = post.uuid
      this.content = post.content
      this.create_at = post.create_at
      this.user = post.user
      this.type = post.type
      this.reposted_at = post.reposted_at
   }

   public set setType(type: 'post' | 'repost') { this.type = type }
   public set setContent(content: string) { this.content = content }
   public set setCreateAt(create_at: string) { this.create_at = create_at }
   get getRepostedAt() { return this.reposted_at }
   public set setUser(user: User) { this.user = user }
   public get getType() { return this.type }
   public get getContent() { return this.content }
   public get getCreateAt() { return this.create_at }
   public set setRepostedAt(reposted_at: string) { this.reposted_at = reposted_at }
   public get getUser() { return this.user }
   public get getUUID() { return this.uuid }
}
