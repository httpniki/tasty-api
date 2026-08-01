import { type SocketType } from '@/chat/chat.socket'
import ChatError, { ErrorName } from '@/chat/dto/ChatError'
import Message from '@/chat/dto/Message'
import User from '@/chat/dto/User'
import ChatServiceException from '@/chat/errors/ChatServiceException'
import ChatService, { type Chat, type Message as MessageType } from '@/chat/services/chat.service'
import MessageService from '@/chat/services/message.service'
import UserServiceException from '@/user/errors/UserServiceException'
import ProfileService from '@/user/services/profile.service'
import UserService from '@/user/services/user.service'

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
   private readonly profileService = new ProfileService()

   constructor(body: RequestBody, socket: SocketType, connections: Map<string, string>) {
      this.socket = socket
      this.connections = connections
      this.sendMessage(body)
   }

   async sendMessage({ from, to, message }: RequestBody) {
      const user_uuid = this.socket.data.user_uuid
      let current: Awaited<ReturnType<UserService['findUser']>> | null = null
      let target: Awaited<ReturnType<UserService['findUser']>> | null = null
      let chat: Chat | null = null

      try {
         current = await this.userService.findUser({ uuid: user_uuid })
      } catch (err: unknown) {
         const chatError = new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error', err)
         return this.socket
            .to(this.connections.get(from))
            .emit('exception', chatError.toJSON())
      }

      try {
         target = await this.userService.findUser({ uuid: to })
      } catch (err: unknown) {
         const chatError = err instanceof UserServiceException && err.name === 'user_not_found'
            ? new ChatError(ErrorName.NOT_FOUND, 'User not found')
            : new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error', err)

         return this.socket
            .to(this.connections.get(from))
            .emit('exception', chatError.toJSON())
      }

      try {
         try {
            chat = await this.chatService.findConversation({ user_uuids: [current.uuid, target.uuid] })
         } catch (err: unknown) {
            if (!(err instanceof ChatServiceException) || err.name !== 'chat_not_found') throw err
            chat = await this.chatService.createConversation([current.uuid, target.uuid])
         }
      } catch (err: unknown) {
         const chatError = new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error', err)
         return this.socket
            .to(this.connections.get(from))
            .emit('exception', chatError.toJSON())
      }

      let msg: MessageType | null = null

      try {
         msg = await this.messageService.addMessage(chat.uuid, { user_uuid: current.uuid, content: message })
      } catch (err: unknown) {
         const chatError = new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error', err)
         return this.socket
            .to(this.connections.get(from))
            .emit('exception', chatError.toJSON())
      }

      let profile: Awaited<ReturnType<ProfileService['findProfile']>> | null = null

      try {
         profile = await this.profileService.findProfile({ user_uuid: current.uuid })
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
               name: profile.name,
               avatar: profile.avatar,
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
