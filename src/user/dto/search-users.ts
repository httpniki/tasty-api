interface SearchUsersType {
   avatar: string
   username: string
   name: string
   followed: boolean
   follower: boolean
}

export default class SearchUsers implements SearchUsersType {
   readonly avatar: SearchUsersType['avatar']
   readonly username: SearchUsersType['username']
   readonly name: SearchUsersType['name']
   readonly followed: SearchUsersType['followed']
   readonly follower: SearchUsersType['follower']

   constructor(user: SearchUsersType) {
      this.avatar = user.avatar
      this.username = user.username
      this.name = user.name
      this.followed = user.followed
      this.follower = user.follower
   }
}