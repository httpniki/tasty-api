import type { NextFunction, Request, Response } from 'express'

import PaginatedResponse from '@/shared/response/http/PaginatedResponse'

import Notification from '../dto/Notification'
import NotificationService from '../services/notification.service'

export default class GetNotificationsController {
   private req: Request
   private res: Response
   private next: NextFunction
   private readonly notificationService = new NotificationService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req
      this.res = res
      this.next = next

      this.execute()
   }

   private async execute() {
      if (!this.req.session) return this.next(new Error('Session not found'))

      const { user_uuid } = this.req.session
      const page = Number(this.req.query.page) || 1
      const limit = Number(this.req.query.limit) || 20

      try {
         const response = await this.notificationService.findNotifications(user_uuid, page, limit)
         const dto = response.data.map((n) => new Notification(n))
         const paging = new PaginatedResponse(dto, response.paging)
         return this.res.status(200).json(paging)
      } catch (error) {
         return this.next(error)
      }
   }
}
