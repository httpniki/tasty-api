import { type NextFunction, type Request, type Response } from 'express'
import { type ParamsDictionary } from 'express-serve-static-core'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import PaginatedResponse, { Paging } from '@/shared/response/http/PaginatedResponse'
import UserService, { type User as UserServiceType } from '@/user/services/user.service'

import Conversation from '../dto/Conversation'
import Message from '../dto/Message'
import User from '../dto/User'
import ChatService, { type Chat as ChatType } from '../services/chat.service'

interface RequestQuery {
   page?: string
   limit?: string
}

export default class GetChatsController {
   private req: Request<ParamsDictionary, any, any, RequestQuery>
   private res: Response
   private next: NextFunction
   private userService = new UserService()
   private chatService = new ChatService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req
      this.res = res
      this.next = next
      this.execute()
   }

   public async execute() {
      const { user_uuid } = this.req.session
      const page = parseInt(this.req.query.page ?? '1')
      const limit = parseInt(this.req.query.limit ?? '5')
      let user: UserServiceType
      let chats: ChatType[]
      let dto: Conversation[]

      if (isNaN(page) || isNaN(limit)) {
         const exception = ExceptionFactory.invalidParam('page and limit must be numbers')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (page < 1 || limit < 1) {
         const exception = ExceptionFactory.invalidParam('page and limit must be greater than 0')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      try {
         const result = await this.userService.findUser({ uuid: user_uuid })
         if (!result) throw new Error('Authenticated user not found')

         user = result
      } catch (error) {
         return this.next(error)
      }

      try {
         chats = await this.getChats(user.chats.slice((page - 1) * limit, page * limit))
         dto = await Promise.all(chats.map(async (chat) => await this.transformChatToConversation(chat)))
      } catch (error) {
         return this.next(error)
      }

      const paging = new Paging({ page, limit, total_results: chats.length, max_page: Math.ceil(chats.length / limit) })
      const response = new PaginatedResponse(dto, paging)

      return this.res.status(200).json(response)
   }

   private async getChats(user_chats: UserServiceType['chats']) {
      const chatPromise = user_chats.map(async (chat) => await this.chatService.findConversation({ uuid: chat.uuid }))
      return await Promise.all(chatPromise)
   }

   private async getUsersFromChat(chat: ChatType): Promise<User[]> {
      return await Promise.all(
         chat.users.map(async (userId) => {
            const user = await this.userService.findUser({ _id: userId.toString() })
            if (!user) throw new Error('Chat user not found')

            return new User({
               uuid: user.uuid,
               name: user.name,
               username: user.username,
               avatar: user.avatar
            })
         })
      )
   }

   private async getLastMessageFromChat(chat: ChatType): Promise<Message> {
      const last = chat.messages[chat.messages.length - 1]
      if (!last) throw new Error('Chat has no messages')

      const user = await this.userService.findUser({ uuid: last.user_id })
      if (!user) throw new Error('Last message user not found')

      const userDTO = new User({
         uuid: user.uuid,
         name: user.name,
         username: user.username,
         avatar: user.avatar
      })

      return new Message({
         uuid: last.uuid,
         content: last.content,
         timestamp: last.timestamp,
         user: userDTO,
         read: last.read,
         deleted: last.deleted,
         deletedAt: last.deletedAt
      })
   }

   private async transformChatToConversation(chat: ChatType): Promise<Conversation> {
      const [users, last_message] = await Promise.all([
         this.getUsersFromChat(chat),
         this.getLastMessageFromChat(chat)
      ])

      return new Conversation({
         uuid: chat.uuid,
         users,
         last_message,
         created_at: chat.created_at
      })
   }
}
