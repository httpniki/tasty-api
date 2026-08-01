interface SearchUserType {
   avatar: string
   username: string
   name: string
   followed: boolean
   follower: boolean
   uuid: string
}

export default class SearchUser implements SearchUserType {
   readonly avatar: SearchUserType['avatar']
   readonly username: SearchUserType['username']
   readonly name: SearchUserType['name']
   readonly followed: SearchUserType['followed']
   readonly follower: SearchUserType['follower']
   readonly uuid: string

   constructor(user: SearchUserType) {
      this.avatar = user.avatar
      this.username = user.username
      this.name = user.name
      this.followed = user.followed
      this.follower = user.follower
      this.uuid = user.uuid
   }
}
