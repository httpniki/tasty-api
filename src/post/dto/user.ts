interface UserType {
   uuid: string
   username: string
   name: string
   avatar: string
   header: string
   followers: number
   follows: number
   posts: number
}

export default class User {
   readonly uuid: string
   readonly username: string
   readonly name: string
   readonly avatar: string
   readonly header: string
   readonly posts: number
   readonly followers: number
   readonly follows: number

   constructor(user: UserType) {
      this.uuid = user.uuid
      this.username = user.username
      this.name = user.name
      this.avatar = user.avatar
      this.header = user.header
      this.followers = user.followers
      this.follows = user.follows
      this.posts = user.posts
   }
}
