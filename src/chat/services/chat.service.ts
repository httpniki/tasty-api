import { Error as MongooseError } from 'mongoose'
import { v4 as uuid } from 'uuid'

import ProfileModel from '@/user/models/profile.model'

import { ChatServiceExceptionFactory } from '../errors/ChatServiceException'
import ChatModel, { type IChat, type IMessage } from '../models/chat.model'

export type Chat = Omit<IChat, '_id'>

export type Message = IMessage

interface FindConversationArgs {
   uuid?: string
   user_uuids?: [string, string]
   message_uuid?: string
}

export default class ChatService {
   private chat_projection = {
      uuid: true,
      users: true,
      messages: true,
      created_at: true
   }

   async findConversation(args: FindConversationArgs): Promise<Chat> {
      if (args.uuid) {
         const result = await ChatModel
            .findOne()
            .where({ uuid: args.uuid })
            .select(this.chat_projection)

         if (!result) throw ChatServiceExceptionFactory.chatNotFound({ uuid: args.uuid })

         const conversation = result.toJSON()

         return {
            uuid: conversation.uuid,
            users: conversation.users as [string, string],
            messages: conversation.messages,
            created_at: conversation.created_at
         }
      }

      if (args.user_uuids) {
         const result = await ChatModel
            .findOne()
            .where({
               $and: [
                  { users: args.user_uuids[0] },
                  { users: args.user_uuids[1] }
               ]
            })
            .select(this.chat_projection)

         if (!result) throw ChatServiceExceptionFactory.chatNotFound({ user_uuids: args.user_uuids })

         const conversation = result.toJSON()

         return {
            uuid: conversation.uuid,
            users: conversation.users as Chat['users'],
            messages: conversation.messages,
            created_at: conversation.created_at
         }
      }

      if (args.message_uuid) {
         const result = await ChatModel
            .findOne()
            .where({ 'messages.uuid': args.message_uuid })
            .select(this.chat_projection)

         if (!result) throw ChatServiceExceptionFactory.chatNotFound({ message_uuid: args.message_uuid })

         const conversation = result.toJSON()

         return {
            uuid: conversation.uuid,
            users: conversation.users as Chat['users'],
            messages: conversation.messages,
            created_at: conversation.created_at
         }
      }
   }

   async createConversation(user_uuids: [string, string]): Promise<Chat> {
      const [uuid1, uuid2] = user_uuids

      const [profile1, profile2] = await Promise.all([
         ProfileModel.findOne().where({ user_uuid: uuid1 }),
         ProfileModel.findOne().where({ user_uuid: uuid2 })
      ])

      if (!profile1) throw ChatServiceExceptionFactory.profileNotFound({ user_uuid: uuid1 })
      if (!profile2) throw ChatServiceExceptionFactory.profileNotFound({ user_uuid: uuid2 })

      const chatModel = new ChatModel({
         uuid: uuid(),
         users: user_uuids,
         messages: [],
         created_at: new Date()
      })

      const error = await chatModel
         .validate()
         .catch((err: MongooseError.ValidationError) => Object.values(err.errors)[0])

      if (error && error instanceof MongooseError.ValidatorError) throw ChatServiceExceptionFactory.validationError(error.message, { [error.path]: error.message })
      if (error && error instanceof MongooseError.CastError) throw error

      const conversation = (await chatModel.save()).toJSON()

      await ProfileModel
         .findOneAndUpdate({ runValidators: true })
         .where({ user_uuid: uuid1 })
         .set({
            chats: profile1.chats.concat({
               uuid: conversation.uuid,
               users: user_uuids
            })
         })

      await ProfileModel
         .findOneAndUpdate({ runValidators: true })
         .where({ user_uuid: uuid2 })
         .set({
            chats: profile2.chats.concat({
               uuid: conversation.uuid,
               users: user_uuids
            })
         })

      return {
         uuid: conversation.uuid,
         users: conversation.users as Chat['users'],
         messages: conversation.messages,
         created_at: conversation.created_at
      }
   }
}
