import { BaseRouter } from '@/shared/router/router'

import ChatController from './chat.controller'
import ChatMiddleware from './chat.middleware'

export default class ChatRouter extends BaseRouter<ChatMiddleware, ChatController> {
   constructor() {
      super(ChatMiddleware, ChatController)
   }

   routes(): void {
      this.router.get('/chats', this.controller.getChats)
      this.router.get('/chats/:id', this.controller.getChat)
   }
}
