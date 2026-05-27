import { type SocketType } from '@/chat/chat.socket'
import ChatService, { type Chat } from '@/chat/services/chat.service'
import MessageService from '@/chat/services/message.service'
import { SocketExceptionFactory } from '@/shared/response/socket/SocketExceptionFactory'
import UserService, { type User } from '@/user/services/user.service'

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
      let current: User | null = null
      let target: User | null = null
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

      try {
         await this.messageService.addMessage(chat.uuid, { user_id: current.uuid, content: message })
      } catch {
         const exception = SocketExceptionFactory.internalServerError()
         return this.socket
            .to(this.connections.get(from))
            .emit('error', exception.data)
      }

      if (this.connections.has(to)) {
         this.socket
            .to(this.connections.get(to))
            .emit('message:receive', { message, from, to })
      }
   }
}
