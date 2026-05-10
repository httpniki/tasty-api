import { v4 as uuid } from 'uuid'

import ServiceError, { ServiceErrorName } from '@/shared/errors/ServiceError'
import UserModel from '@/user/models/user.model'
import UserService from '@/user/services/user.service'

import ChatModel, { type IChat, type IMessage } from '../models/chat.model'

export type Chat = Omit<IChat, '_id' | 'users'> & {
   users: [string, string]
}

export type Message = IMessage

interface FindConversationArgs {
   uuid?: string
   user_ids?: [string, string]
   user_uuids?: [string, string]
}

export default class ChatService {
   private projection = {
      _id: true,
      uuid: true,
      users: true,
      messages: true,
      created_at: true
   }

   private userService = new UserService()

   /**
      @throws ServiceError.DatabaseError
      @throws ServiceError.NotFound
   **/
   async findConversation(args: FindConversationArgs): Promise<Chat | null> {
      let chat: Chat | null = null

      try {
         if (args.uuid) {
            const result = await ChatModel
               .findOne()
               .where({ uuid: args.uuid })
               .select(this.projection)

            if (result) chat = result.toObject()
         }

         if (args.user_ids) {
            const [id1, id2] = args.user_ids
            const result = await ChatModel
               .findOne()
               .where({
                  $and: [
                     { users: id1 },
                     { users: id2 }
                  ]
               })
               .select(this.projection)

            if (result) chat = result.toObject()
         }

         if (args.user_uuids) {
            const [uuid1, uuid2] = args.user_uuids

            const [user1, user2] = await Promise.all([
               UserModel.findOne().where({ uuid: uuid1 }).select({ _id: true }),
               UserModel.findOne().where({ uuid: uuid2 }).select({ _id: true })
            ])

            if (!user1 || !user2) throw new ServiceError(ServiceErrorName.NotFound, 'User not found', null, { uuid1, uuid2 })

            const result = await ChatModel
               .findOne()
               .where({
                  $and: [
                     { users: user1._id },
                     { users: user2._id }
                  ]
               })
               .select(this.projection)

            if (result) chat = result.toObject()
         }
      } catch (error: any) {
         if (error instanceof ServiceError) throw error
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }

      return chat
   }

   /**
      @throws ServiceError.InvalidInput
      @throws ServiceError.DatabaseError
   **/
   async createConversation(user1Id: string, user2Id: string): Promise<Chat> {
      let savedChat: Chat | null = null
      const user1 = await this.userService.findUser({ _id: user1Id.toString() })
      const user2 = await this.userService.findUser({ _id: user2Id.toString() })

      const chatModel = new ChatModel({
         uuid: uuid(),
         users: [user1Id, user2Id],
         messages: [],
         created_at: new Date()
      })

      const validationError = chatModel.validateSync()
      if (validationError) throw new ServiceError(ServiceErrorName.InvalidInput, validationError.message, validationError)

      try {
         const result = await chatModel.save()
         savedChat = result.toObject()
      } catch (error: any) {
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }

      await this.userService.updateUser(
         user1Id,
         {
            chats: user1.chats.concat({
               uuid: savedChat.uuid,
               users: [user1.uuid, user2.uuid]
            }),
         }
      )

      await this.userService.updateUser(
         user2Id,
         {
            chats: user2.chats.concat({
               uuid: savedChat.uuid,
               users: [user1.uuid, user2.uuid]
            }),
         }
      )

      return savedChat
   }

   /**
      @throws ServiceError.NotFound
      @throws ServiceError.DatabaseError
   **/
   async addMessage(chatUuid: string, messageData: { user_id: string; content: string }): Promise<Chat> {
      const newMessage: IMessage = {
         uuid: uuid(),
         user_id: messageData.user_id,
         content: messageData.content,
         timestamp: new Date()
      }

      try {
         const updatedChat = await ChatModel
            .findOneAndUpdate(
               { uuid: chatUuid },
               { $push: { messages: newMessage } },
               { new: true }
            )
            .select(this.projection)

         if (!updatedChat) throw new ServiceError(ServiceErrorName.NotFound, 'Chat not found', null, { chatUuid })

         return updatedChat.toObject()
      } catch (error: any) {
         if (error instanceof ServiceError) throw error
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }
   }

   /**
      @throws ServiceError.NotFound
      @throws ServiceError.DatabaseError
   **/
   async deleteMessage(chatUuid: string, messageUuid: string): Promise<Chat> {
      try {
         const updatedChat = await ChatModel
            .findOneAndUpdate(
               { uuid: chatUuid },
               { $pull: { messages: { uuid: messageUuid } } },
               { new: true }
            )
            .select(this.projection)

         if (!updatedChat) throw new ServiceError(ServiceErrorName.NotFound, 'Chat not found', null, { chatUuid })

         return updatedChat.toObject()
      } catch (error: any) {
         if (error instanceof ServiceError) throw error
         throw new ServiceError(ServiceErrorName.DatabaseError, error.message, error)
      }
   }
}
