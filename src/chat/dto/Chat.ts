import { type Chat as ChatType } from '../services/chat.service'
import type Message from './Message'

type ConstructorArgs = Omit<ChatType, 'messages' | 'users'>
   & { messages: Message[] }
   & { users: string[] }

export default class Chat {
   private uuid: string
   private users: string[]
   private messages: Message[]
   private created_at: Date
   constructor(data: ConstructorArgs) {
      this.uuid = data.uuid
      this.users = data.users
      this.messages = data.messages
      this.created_at = data.created_at
   }
}

