import type User from './User'

interface MessageType {
   uuid: string
   content: string | null
   timestamp: Date
   read: boolean
   deleted: boolean
   deletedAt: Date | null
   user: User
}

type ConstructorArgs = MessageType & {
   user: User
}

export default class Message {
   private content: string | null
   private uuid: string
   private timestamp: Date
   private user: User
   private read: boolean
   private deleted: boolean
   private deletedAt: Date | null
   constructor(data: ConstructorArgs) {
      this.content = data.content
      this.timestamp = data.timestamp
      this.uuid = data.uuid
      this.user = data.user
      this.read = data.read
      this.deleted = data.deleted
      this.deletedAt = data.deletedAt
   }
}
