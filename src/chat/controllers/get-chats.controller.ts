import { type NextFunction, type Request, type Response } from 'express'
import { type ParamsDictionary } from 'express-serve-static-core'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import PaginatedResponse, { Paging } from '@/shared/response/http/PaginatedResponse'
import UserService, { type User as UserServiceType } from '@/user/services/user.service'

import Chat from '../dto/Chat'
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
      let dto: Chat[]

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
         dto = await Promise.all(chats.map(async (chat) => await this.transformChatToDTO(chat)))
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

   private async transformMessageToDTO(messages: ChatType['messages']): Promise<Message[]> {
      const promise = messages.map(async (message) => {
         const user = await this.userService.findUser({ uuid: message.user_id })

         if (!user) throw new Error('User not found')

         const userDTO = new User({
            uuid: user.uuid,
            name: user.name,
            username: user.username,
            avatar: user.avatar
         })

         const msg = new Message({
            uuid: message.uuid,
            content: message.content,
            timestamp: message.timestamp,
            user: userDTO,
            read: message.read
         })

         return msg
      })

      return await Promise.all(promise)
   }

   private async transformChatToDTO(chat: ChatType): Promise<Chat> {
      const parsedMessages = await this.transformMessageToDTO(chat.messages)

      return new Chat({
         uuid: chat.uuid,
         users: chat.users,
         messages: parsedMessages,
         created_at: chat.created_at
      })
   }
}
