import { type SocketType } from '@/chat/chat.socket'
import ChatService, { type Chat, type Message } from '@/chat/services/chat.service'
import MessageService from '@/chat/services/message.service'
import { SocketExceptionFactory } from '@/shared/response/socket/SocketExceptionFactory'

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

         if (!chat) {
            const exception = SocketExceptionFactory.notFound('Chat not found')
            return this.socket
               .to(usersConnections[0])
               .emit('error', exception.data)
         }

         chat.users.forEach(user => {
            const connection = this.connections.get(user)
            if (!connection || usersConnections.some((el) => el === connection)) return
            usersConnections.push(connection)
         })
      } catch {
         const exception = SocketExceptionFactory.internalServerError()
         return this.socket
            .to(usersConnections[0])
            .emit('error', exception.data)
      }

      const targetMessage = chat.messages.find(m => m.uuid === message_uuid)

      if (!targetMessage) {
         const exception = SocketExceptionFactory.notFound('Message not found')
         return this.socket
            .to(usersConnections[0])
            .emit('error', exception.data)
      }

      if (targetMessage.user_id !== userUuid) {
         const exception = SocketExceptionFactory.invalidInput('You can only delete your own messages')
         return this.socket
            .to(usersConnections[0])
            .emit('error', exception.data)
      }

      let updatedMessage: Message

      try {
         updatedMessage = await this.messageService.deleteMessage(message_uuid)
      } catch (err: any) {
         console.error(err)

         const exception = SocketExceptionFactory.internalServerError()
         return this.socket
            .to(usersConnections[0])
            .emit('error', exception.data)
      }

      return this.socket
         .to(usersConnections)
         .emit('message:updated', { message: updatedMessage })
   }
}
