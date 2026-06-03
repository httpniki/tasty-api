import { type SocketType } from '@/chat/chat.socket'
import Message from '@/chat/dto/Message'
import User from '@/chat/dto/User'
import ChatService, { type Chat, type Message as MessageType } from '@/chat/services/chat.service'
import MessageService from '@/chat/services/message.service'
import { SocketExceptionFactory } from '@/shared/response/socket/SocketExceptionFactory'
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
      } catch {
         const exception = SocketExceptionFactory.internalServerError()
         return this.socket
            .to(this.connections.get(from))
            .emit('error', exception.data)
      }

      if (!current) {
         const exception = SocketExceptionFactory.internalServerError()
         return this.socket
            .to(this.connections.get(from))
            .emit('error', exception.data)
      }

      if (!target) {
         const exception = SocketExceptionFactory.notFound()
         return this.socket
            .to(this.connections.get(from))
            .emit('error', exception.data)
      }

      try {
         chat = await this.chatService.findConversation({ user_uuids: [current.uuid, target.uuid] })
         if (!chat) chat = await this.chatService.createConversation(current._id.toString(), target._id.toString())
      } catch {
         const exception = SocketExceptionFactory.internalServerError()
         return this.socket
            .to(this.connections.get(from))
            .emit('error', exception.data)
      }

      let msg: MessageType | null = null
      const user: User | null = null

      try {
         msg = await this.messageService.addMessage(chat.uuid, { user_id: current.uuid, content: message })
      } catch {
         const exception = SocketExceptionFactory.internalServerError()
         return this.socket
            .to(this.connections.get(from))
            .emit('error', exception.data)
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
