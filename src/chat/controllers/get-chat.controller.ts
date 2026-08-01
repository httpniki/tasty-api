import { type NextFunction, type Request, type Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'
import ProfileService from '@/user/services/profile.service'
import UserService from '@/user/services/user.service'

import Message from '../dto/Message'
import User from '../dto/User'
import ChatServiceException from '../errors/ChatServiceException'
import ChatService, { type Chat as ChatType } from '../services/chat.service'

interface RequestQuery {
   page?: string
   limit?: string
}

export default class GetChatController {
   private req: Request<{ uuid: string }, any, any, RequestQuery>
   private res: Response
   private next: NextFunction
   private readonly userService = new UserService()
   private readonly profileService = new ProfileService()
   private readonly chatService = new ChatService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as unknown as Request<{ uuid: string }, any, any, RequestQuery>
      this.res = res
      this.next = next
      this.execute()
   }

   public async execute() {
      if (!this.req.session) return this.next(new Error('Session not found'))

      const { user_uuid } = this.req.session
      const { uuid } = this.req.params
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
         chat = await this.chatService.findConversation({ uuid: uuid })
      } catch (error: unknown) {
         if (error instanceof ChatServiceException && error.name === 'chat_not_found') {
            const exception = ExceptionFactory.notFound('Chat not found')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }

      const isParticipant = chat.users.includes(user_uuid)

      if (!isParticipant) {
         const exception = ExceptionFactory.forbidden
         return this.res.status(exception.status).json(exception.toJSON())
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
      } catch (error: unknown) {
         return this.next(error)
      }
   }

   private async transformMessagesToDTO(messages: ChatType['messages']): Promise<Message[]> {
      const promise = messages.map(async (message) => {
         const [user, profile] = await Promise.all([
            this.userService.findUser({ uuid: message.user_uuid }),
            this.profileService.findProfile({ user_uuid: message.user_uuid })
         ])

         const userDTO = new User({
            uuid: user.uuid,
            name: profile.name,
            username: user.username,
            avatar: profile.avatar
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
