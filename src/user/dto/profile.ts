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
      type: 'post'
      uuid: string
   }[]
   followed: boolean
   follower: boolean
   current_user: boolean
}

export default class Profile implements ProfileType {
   readonly uuid: ProfileType['uuid']
   readonly name: ProfileType['name']
   readonly username: ProfileType['username']
   readonly description: ProfileType['description']
   readonly email: ProfileType['email']
   readonly avatar: ProfileType['avatar']
   readonly header: ProfileType['header']
   readonly birthday: ProfileType['birthday']
   readonly follows: ProfileType['follows']
   readonly followers: ProfileType['followers']
   readonly followed: ProfileType['followed']
   readonly follower: ProfileType['follower']
   readonly posts: ProfileType['posts']
   readonly current_user: ProfileType['current_user']

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
}
