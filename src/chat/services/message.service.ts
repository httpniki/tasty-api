import { v4 as uuid } from 'uuid'

import ChatModel, { type IMessage } from '../models/chat.model'
import { type Chat, type Message } from './chat.service'

export default class MessageService {
   private projection = {
      _id: true,
      uuid: true,
      users: true,
      messages: true,
      created_at: true,
      read: true
   }

   /**
      @throws chat_not_found
      @throws message_not_found
      @throws forbidden
   **/
   async readMessage(messageUuid: string, userUuid: string): Promise<Message> {
      const chat = await ChatModel
         .findOne()
         .where({ 'messages.uuid': messageUuid })
         .select({ ...this.projection })

      if (!chat) {
         const err = new Error('Chat not found')
         err.name = 'chat_not_found'
         throw err
      }

      const message = chat.messages.find(m => m.uuid === messageUuid)

      if (!message) {
         const err = new Error('Message not found')
         err.name = 'message_not_found'
         throw err
      }

      if (message.user_id !== userUuid) {
         const err = new Error('You can only read your own messages')
         err.name = 'forbidden'
         throw err
      }

      let msgCopy: Message | null = null

      chat.messages = chat.messages.map(m => {
         if (m.uuid === messageUuid) {
            m.read = true
            msgCopy = m
         }

         return m
      })

      await ChatModel.findOneAndUpdate(
         { uuid: chat.uuid, 'messages.uuid': messageUuid },
         { $set: { messages: chat.messages } }
      )

      return msgCopy
   }

   async addMessage(chatUuid: string, messageData: { user_id: string; content: string }): Promise<Chat> {
      const newMessage: IMessage = {
         uuid: uuid(),
         user_id: messageData.user_id,
         content: messageData.content,
         timestamp: new Date(),
         read: false
      }

      const updatedChat = await ChatModel
         .findOneAndUpdate(
            { uuid: chatUuid },
            { $push: { messages: newMessage } },
            { new: true }
         )
         .select(this.projection)

      return updatedChat.toObject()
   }
}
