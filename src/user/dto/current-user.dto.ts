interface ProfileConstructor {
   name: string
   avatar: string
}

interface CurrentUserConstructor {
   uuid: string
   username: string
   email: string
   profile: Profile 
   status: 'ACTIVE'
}

export class Profile {
   private name: string
   private avatar: string

   constructor({ name, avatar }: ProfileConstructor) {
      this.name = name
      this.avatar = avatar
   }
}

export default class CurrentUser {
   private uuid: string
   private username: string 
   private email: string
   private status: 'ACTIVE'
   private profile: Profile 

   constructor(user: CurrentUserConstructor) {
      this.uuid = user.uuid
      this.username = user.username
      this.email = user.email
      this.profile = user.profile
      this.status = user.status
   }
}
