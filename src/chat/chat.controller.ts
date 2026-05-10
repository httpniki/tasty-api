import { type NextFunction, type Request, type Response } from 'express'

import { Auth } from '@/auth/auth.decorator'

import GetChatsController from './controllers/get-chats.controller'

export default class ChatController {
   @Auth.consumeAccess({ required: true })
   public async getChats(req: Request, res: Response, next: NextFunction) {
      return new GetChatsController(req, res, next)
   }
}
