import { type NextFunction, type Request, type Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import UserService from '@/user/services/user.service'

import Message from '../dto/Message'
import User from '../dto/User'
import ChatService, { type Chat as ChatType } from '../services/chat.service'

interface RequestQuery {
   page?: string
   limit?: string
}

export default class GetChatController {
   private req: Request<{ id: string }, any, any, RequestQuery>
   private res: Response
   private next: NextFunction
   private userService = new UserService()
   private chatService = new ChatService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as unknown as Request<{ id: string }, any, any, RequestQuery>
      this.res = res
      this.next = next
      this.execute()
   }

   public async execute() {
      const { user_uuid } = this.req.session
      const { id } = this.req.params
      const page = parseInt(this.req.query.page ?? '1')
      const limit = parseInt(this.req.query.limit ?? '20')
      let chat: ChatType

      if (isNaN(page) || isNaN(limit)) {
         const exception = ExceptionFactory.invalidParam('page and limit must be numbers')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      if (page < 1 || limit < 1) {
         const exception = ExceptionFactory.invalidParam('page and limit must be greater than 0')
         return this.res.status(exception.status).json(exception.toJSON())
      }

      try {
         const result = await this.chatService.findConversation({ uuid: id })
         if (!result) {
            const exception = ExceptionFactory.notFound('Chat not found')
            return this.res.status(exception.status).json(exception.toJSON())
         }
         chat = result
      } catch (error) {
         return this.next(error)
      }

      try {
         const isParticipant = await this.userIsParticipant(user_uuid, chat.users)
         if (!isParticipant) {
            const exception = ExceptionFactory.forbidden
            return this.res.status(exception.status).json(exception.toJSON())
         }
      } catch (error) {
         return this.next(error)
      }

      try {
         const totalMessages = chat.messages.length
         const paginatedMessages = chat.messages.slice((page - 1) * limit, page * limit)
         const parsedMessages = await this.transformMessagesToDTO(paginatedMessages)

         return this.res.status(200).json({
            uuid: chat.uuid,
            users: chat.users.map((u) => u.toString()),
            messages: parsedMessages,
            created_at: chat.created_at,
            paging: {
               page,
               limit,
               total_results: totalMessages,
               max_page: Math.max(1, Math.ceil(totalMessages / limit))
            }
         })
      } catch (error) {
         return this.next(error)
      }
   }

   private async userIsParticipant(user_uuid: string, chatUserIds: ChatType['users']): Promise<boolean> {
      const user = await this.userService.findUser({ uuid: user_uuid })
      if (!user) return false
      const userId = user._id.toString()
      return chatUserIds.some((id) => id.toString() === userId)
   }

   private async transformMessagesToDTO(messages: ChatType['messages']): Promise<Message[]> {
      const promise = messages.map(async (message) => {
         const user = await this.userService.findUser({ uuid: message.user_id })
         if (!user) throw new Error('User not found')

         const userDTO = new User({
            uuid: user.uuid,
            name: user.name,
            username: user.username,
            avatar: user.avatar
         })

         return new Message({
            uuid: message.uuid,
            content: message.content,
            timestamp: message.timestamp,
            user: userDTO,
            read: message.read,
            deleted: message.deleted,
            deletedAt: message.deletedAt
         })
      })

      return await Promise.all(promise)
   }
}
