import { type SocketType } from '@/chat/chat.socket'
import ChatError, { ErrorName } from '@/chat/dto/ChatError'
import Message from '@/chat/dto/Message'
import User from '@/chat/dto/User'
import ChatService, { type Chat, type Message as MessageType } from '@/chat/services/chat.service'
import MessageService from '@/chat/services/message.service'
import UserService, { type User as UserType } from '@/user/services/user.service'

interface RequestBody {
   message: string
   from: string
   to: string
}

export default class SendMessageEvent {
   private readonly socket: SocketType
   private readonly connections: Map<string, string>
   private readonly userService = new UserService()
   private readonly chatService = new ChatService()
   private readonly messageService = new MessageService()

   constructor(body: RequestBody, socket: SocketType, connections: Map<string, string>) {
      this.socket = socket
      this.connections = connections
      this.sendMessage(body)
   }

   async sendMessage({ from, to, message }: RequestBody) {
      const user_uuid = this.socket.data.user_uuid
      let current: UserType | null = null
      let target: UserType | null = null
      let chat: Chat | null = null

      try {
         current = await this.userService.findUser({ uuid: user_uuid })
         target = await this.userService.findUser({ uuid: to })
      } catch (err: unknown) {
         const chatError = new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error', err)
         return this.socket
            .to(this.connections.get(from))
            .emit('exception', chatError.toJSON())
      }

      if (!current) {
         const chatError = new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error')
         return this.socket
            .to(this.connections.get(from))
            .emit('exception', chatError.toJSON())
      }

      if (!target) {
         const chatError = new ChatError(ErrorName.NOT_FOUND, 'User not found')
         return this.socket
            .to(this.connections.get(from))
            .emit('exception', chatError.toJSON())
      }

      try {
         chat = await this.chatService.findConversation({ user_uuids: [current.uuid, target.uuid] })
         if (!chat) chat = await this.chatService.createConversation(current._id.toString(), target._id.toString())
      } catch (err: unknown) {
         const chatError = new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error', err)
         return this.socket
            .to(this.connections.get(from))
            .emit('exception', chatError.toJSON())
      }

      let msg: MessageType | null = null

      try {
         msg = await this.messageService.addMessage(chat.uuid, { user_id: current.uuid, content: message })
      } catch (err: unknown) {
         const chatError = new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error', err)
         return this.socket
            .to(this.connections.get(from))
            .emit('exception', chatError.toJSON())
      }

      if (this.connections.has(to)) {
         const dto = new Message({
            uuid: msg.uuid,
            content: msg.content,
            timestamp: msg.timestamp,
            user: new User({
               uuid: current.uuid,
               username: current.username,
               name: current.name,
               avatar: current.avatar,
            }),
            read: msg.read,
            deleted: msg.deleted,
            deletedAt: msg.deletedAt
         })

         this.socket
            .to(this.connections.get(to))
            .emit('message:receive', dto)
      }
   }
}
