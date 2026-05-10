interface UserType {
   uuid: string
   name: string
   username: string
   avatar: string
}

export default class User {
   private uuid: string
   private name: string
   private username: string
   private avatar: string
   constructor(data: UserType) {
      this.uuid = data.uuid
      this.name = data.name
      this.username = data.username
      this.avatar = data.avatar
   }
}
