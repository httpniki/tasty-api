import { v4 as uuid } from 'uuid'

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
      created_at: true,
      read: true
   }

   private userService = new UserService()

   /**
      @throws user_not_found
   **/
   async findConversation(args: FindConversationArgs): Promise<Chat | null> {
      let chat: Chat | null = null

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

         if (!user1 || !user2) {
            const err = new Error('User not found')
            err.name = 'user_not_found'
            throw err
         }

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

      return chat
   }

   /**
      @throws invalid_input
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

      if (validationError) {
         const err = new Error(validationError.message)
         err.name = 'invalid_input'
         throw err
      }

      const result = await chatModel.save()
      savedChat = result.toObject()

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
}
