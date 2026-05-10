import type User from './User'

interface MessageType {
   uuid: string
   content: string
   timestamp: Date
}

type ConstructorArgs = MessageType & {
   user: User
}

export default class Message {
   private content: string
   private uuid: string
   private timestamp: Date
   private user: User
   constructor(data: ConstructorArgs) {
      this.content = data.content
      this.timestamp = data.timestamp
      this.uuid = data.uuid
      this.user = data.user
   }
}
