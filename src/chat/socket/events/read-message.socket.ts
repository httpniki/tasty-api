import { type SocketType } from '@/chat/chat.socket'
import ChatError, { ErrorName } from '@/chat/dto/ChatError'
import ChatService, { type Chat, type Message } from '@/chat/services/chat.service'
import MessageService from '@/chat/services/message.service'

interface RequestBody {
   message_uuid: string
   chat_uuid: string
}

export default class ReadMessageEvent {
   private readonly socket: SocketType
   private readonly connections: Map<string, string>
   private readonly chatService: ChatService = new ChatService()
   private readonly messageService: MessageService = new MessageService()

   constructor(body: RequestBody, socket: SocketType, connections: Map<string, string>) {
      this.socket = socket
      this.connections = connections
      this.readMessage(body)
   }

   private async readMessage({ message_uuid }: RequestBody) {
      const userUuid = this.socket.data.user_uuid
      const usersConnections = [this.connections.get(userUuid)]

      let chat: Chat

      try {
         chat = await this.chatService.findConversation({ message_uuid })

         if (!chat) {
            const chatError = new ChatError(ErrorName.NOT_FOUND, 'Chat not found')
            return this.socket
               .to(usersConnections[0])
               .emit('exception', chatError.toJSON())
         }

         chat.users.forEach(user => {
            const connection = this.connections.get(user)
            if (!connection || usersConnections.some((el) => el === connection)) return
            usersConnections.push(connection)
         })
      } catch (err: unknown) {
         const chatError = new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error', err)

         return this.socket
            .to(usersConnections[0])
            .emit('exception', chatError.toJSON())
      }

      const targetMessage = chat.messages.find(m => m.uuid === message_uuid)

      if (!targetMessage) {
         const chatError = new ChatError(ErrorName.NOT_FOUND, 'Message not found')
         return this.socket
            .to(usersConnections[0])
            .emit('exception', chatError.toJSON())
      }

      if (targetMessage.user_id !== userUuid) {
         const chatError = new ChatError(ErrorName.INVALID_INPUT, 'You can only read your own messages')
         return this.socket
            .to(usersConnections[0])
            .emit('exception', chatError.toJSON())
      }

      if (targetMessage.read) return
      let updatedMessage: Message

      try {
         updatedMessage = await this.messageService.readMessage(message_uuid)
      } catch (err: unknown) {
         const chatError = new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error', err)

         return this.socket
            .to(usersConnections[0])
            .emit('exception', chatError.toJSON())
      }

      return this.socket
         .to(usersConnections)
         .emit('message:updated', { message: updatedMessage })
   }
}

