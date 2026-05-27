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
   **/
   async readMessage(messageUuid: string): Promise<Message> {
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

   /**
      @throws chat_not_found
      @throws message_not_found
      @throws forbidden
   **/
   async deleteMessage(messageUuid: string): Promise<Message> {
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

      const fifteenMinutes = 15 * 60 * 1000
      const messageAge = Date.now() - new Date(message.timestamp).getTime()

      if (messageAge > fifteenMinutes) {
         const err = new Error('Message can only be deleted within 15 minutes')
         err.name = 'forbidden'
         throw err
      }

      let msgCopy: Message | null = null

      chat.messages = chat.messages.map(m => {
         if (m.uuid === messageUuid) {
            m.content = null
            m.deleted = true
            m.deletedAt = new Date()
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
         read: false,
         deleted: false,
         deletedAt: null
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
