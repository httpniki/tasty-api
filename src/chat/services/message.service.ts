import { v4 as uuid } from 'uuid'

import { ChatServiceExceptionFactory } from '../errors/ChatServiceException'
import ChatModel, { type IMessage } from '../models/chat.model'
import { type Message } from './chat.service'

export default class MessageService {
   private chat_projection = {
      uuid: true,
      users: true,
      messages: true,
      created_at: true
   }

   async readMessage(message_uuid: string): Promise<Message> {
      const result = await ChatModel
         .findOne()
         .where({ 'messages.uuid': message_uuid })
         .select(this.chat_projection)

      if (!result) throw ChatServiceExceptionFactory.chatNotFound({ message_uuid: message_uuid })

      const chat = result.toJSON()

      const message = chat.messages.find(m => m.uuid === message_uuid)

      if (!message) throw ChatServiceExceptionFactory.messageNotFound({ message_uuid: message_uuid })

      const updatedMessage: Message = {
         uuid: message.uuid,
         user_uuid: message.user_uuid,
         content: message.content,
         timestamp: message.timestamp,
         read: true,
         deleted: message.deleted,
         deletedAt: message.deletedAt
      }

      const updatedMessages = chat.messages.map(m =>
         m.uuid === message_uuid ? updatedMessage : m
      )

      await ChatModel
         .findOneAndUpdate({ runValidators: true })
         .where({ uuid: chat.uuid })
         .set({ messages: updatedMessages })
         .select(this.chat_projection)

      return updatedMessage
   }

   async deleteMessage(message_uuid: string): Promise<Message> {
      const result = await ChatModel
         .findOne()
         .where({ 'messages.uuid': message_uuid })
         .select(this.chat_projection)

      if (!result) throw ChatServiceExceptionFactory.chatNotFound({ message_uuid: message_uuid })

      const chat = result.toJSON()

      const message = chat.messages.find(m => m.uuid === message_uuid)

      if (!message) throw ChatServiceExceptionFactory.messageNotFound({ message_uuid: message_uuid })

      const fifteenMinutes = 15 * 60 * 1000
      const messageAge = Date.now() - new Date(message.timestamp).getTime()

      if (messageAge > fifteenMinutes) throw ChatServiceExceptionFactory.timeExpired({ message_uuid: message_uuid })

      const updatedMessage: Message = {
         uuid: message.uuid,
         user_uuid: message.user_uuid,
         content: null,
         timestamp: message.timestamp,
         read: message.read,
         deleted: true,
         deletedAt: new Date()
      }

      const updatedMessages = chat.messages.map(m =>
         m.uuid === message_uuid ? updatedMessage : m
      )

      await ChatModel
         .findOneAndUpdate({ runValidators: true })
         .where({ uuid: chat.uuid })
         .set({ messages: updatedMessages })
         .select(this.chat_projection)

      return updatedMessage
   }

   async findMessage(messageUuid: string): Promise<Message> {
      const result = await ChatModel
         .findOne()
         .where({ 'messages.uuid': messageUuid })
         .select(this.chat_projection)

      if (!result) throw ChatServiceExceptionFactory.chatNotFound({ message_uuid: messageUuid })

      const chat = result.toJSON()

      const message = chat.messages.find(m => m.uuid === messageUuid)

      if (!message) throw ChatServiceExceptionFactory.messageNotFound({ message_uuid: messageUuid })

      return {
         uuid: message.uuid,
         user_uuid: message.user_uuid,
         content: message.content,
         timestamp: message.timestamp,
         read: message.read,
         deleted: message.deleted,
         deletedAt: message.deletedAt
      }
   }

   async addMessage(chatUuid: string, messageData: { user_uuid: string; content: string }): Promise<Message> {
      const result = await ChatModel
         .findOne()
         .where({ uuid: chatUuid })
         .select(this.chat_projection)

      if (!result) throw ChatServiceExceptionFactory.chatNotFound({ uuid: chatUuid })

      const chat = result.toJSON()

      const newMessage: IMessage = {
         uuid: uuid(),
         user_uuid: messageData.user_uuid,
         content: messageData.content,
         timestamp: new Date(),
         read: false,
         deleted: false,
         deletedAt: null
      }

      await ChatModel
         .findOneAndUpdate({ runValidators: true })
         .where({ uuid: chatUuid })
         .set({ messages: [...chat.messages, newMessage] })
         .select(this.chat_projection)

      return {
         uuid: newMessage.uuid,
         user_uuid: newMessage.user_uuid,
         content: newMessage.content,
         timestamp: newMessage.timestamp,
         read: newMessage.read,
         deleted: newMessage.deleted,
         deletedAt: newMessage.deletedAt
      }
   }
}
