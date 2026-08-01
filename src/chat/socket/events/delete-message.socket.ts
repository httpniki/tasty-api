import { type SocketType } from '@/chat/chat.socket'
import ChatError, { ErrorName } from '@/chat/dto/ChatError'
import ChatServiceException from '@/chat/errors/ChatServiceException'
import ChatService, { type Chat, type Message } from '@/chat/services/chat.service'
import MessageService from '@/chat/services/message.service'

interface RequestBody {
   chat_uuid: string
   message_uuid: string
}

export default class DeleteMessageEvent {
   private readonly socket: SocketType
   private readonly connections: Map<string, string>
   private readonly chatService: ChatService = new ChatService()
   private readonly messageService: MessageService = new MessageService()

   constructor(body: RequestBody, socket: SocketType, connections: Map<string, string>) {
      this.socket = socket
      this.connections = connections
      this.deleteMessage(body)
   }

   private async deleteMessage({ chat_uuid, message_uuid }: RequestBody) {
      const userUuid = this.socket.data.user_uuid
      const usersConnections = [this.connections.get(userUuid)]

      let chat: Chat

      try {
         chat = await this.chatService.findConversation({ uuid: chat_uuid })

         chat.users.forEach(user => {
            const connection = this.connections.get(user)
            if (!connection || usersConnections.some((el) => el === connection)) return
            usersConnections.push(connection)
         })
      } catch (err: unknown) {
         if (err instanceof ChatServiceException && err.name === 'chat_not_found') {
            const chatError = new ChatError(ErrorName.NOT_FOUND, 'Chat not found')
            return this.socket
               .to(usersConnections[0])
               .emit('exception', chatError.toJSON())
         }

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

      if (targetMessage.user_uuid !== userUuid) {
         const chatError = new ChatError(ErrorName.INVALID_INPUT, 'You can only delete your own messages')
         return this.socket
            .to(usersConnections[0])
            .emit('exception', chatError.toJSON())
      }

      let updatedMessage: Message

      try {
         updatedMessage = await this.messageService.deleteMessage(message_uuid)
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
