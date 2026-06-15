interface ProfileType {
   uuid: string
   name: string
   username: string
   description: string
   email: string
   avatar: string
   header: string
   birthday: string
   follows: number
   followers: number
   posts: {
      type: 'post' | 'repost'
      created_at: string
      reposted_at?: string
      uuid: string
   }[]
   followed: boolean
   follower: boolean
   current_user: boolean
}

export default class Profile {
   private uuid: ProfileType['uuid']
   private name: ProfileType['name']
   private username: ProfileType['username']
   private description: ProfileType['description']
   private email: ProfileType['email']
   private avatar: ProfileType['avatar']
   private header: ProfileType['header']
   private birthday: ProfileType['birthday']
   private follows: ProfileType['follows']
   private followers: ProfileType['followers']
   private followed: ProfileType['followed']
   private follower: ProfileType['follower']
   private posts: ProfileType['posts']
   private current_user: ProfileType['current_user']
   private created_at: string

   constructor(profile: ProfileType) {
      this.uuid = profile.uuid
      this.name = profile.name
      this.username = profile.username
      this.description = profile.description
      this.email = profile.email
      this.avatar = profile.avatar
      this.header = profile.header
      this.birthday = profile.birthday
      this.follows = profile.follows
      this.followers = profile.followers
      this.posts = profile.posts
      this.followed = profile.followed
      this.follower = profile.follower
      this.current_user = profile.current_user
   }

   public get getPosts() { return this.posts }
   public set setPosts(posts: ProfileType['posts']) { this.posts = posts }
}
