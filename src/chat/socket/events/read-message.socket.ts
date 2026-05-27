import { type SocketType } from '@/chat/chat.socket'
import ChatService, { type Message } from '@/chat/services/chat.service'
import MessageService from '@/chat/services/message.service'
import { SocketExceptionFactory } from '@/shared/response/socket/SocketExceptionFactory'

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

   private async readMessage({ chat_uuid, message_uuid }: RequestBody) {
      const userUuid = this.socket.data.user_uuid
      const usersConnections = [this.connections.get(userUuid)]

      try {
         const chat = await this.chatService.findConversation({ uuid: chat_uuid })

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
      } catch (err: any) {
         const exception = SocketExceptionFactory.internalServerError()
         console.error(err)

         return this.socket
            .to(usersConnections[0])
            .emit('error', exception.data)
      }

      let updatedMessage: Message

      try {
         updatedMessage = await this.messageService.readMessage(message_uuid, userUuid)
      } catch (err) {
         if (err.name === 'chat_not_found' || err.name === 'message_not_found') {
            const exception = SocketExceptionFactory.notFound('Message not found')
            return this.socket
               .to(usersConnections[0])
               .emit('error', exception.data)
         }

         if (err.name === 'forbidden') {
            const exception = SocketExceptionFactory.invalidInput('You can only read your own messages')
            return this.socket
               .to(usersConnections[0])
               .emit('error', exception.data)
         }

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

