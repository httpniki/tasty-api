import { type Chat } from '../services/chat.service'
import type Message from './Message'
import type User from './User'

type ConstructorArgs = Omit<Chat, 'messages' | 'users'>
   & { last_message: Message }
   & { users: User[] }

export default class Conversation {
   private users: User[]
   private uuid: string
   private created_at: Date
   private last_message: Message

   constructor(data: ConstructorArgs) {
      this.users = data.users
      this.uuid = data.uuid
      this.created_at = data.created_at
      this.last_message = data.last_message
   }
}

