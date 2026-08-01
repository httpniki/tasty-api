import type { NextFunction, Request, Response } from 'express'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import NotificationServiceException from '../errors/NotificationServiceException'
import NotificationService from '../services/notification.service'

interface Params {
   notification_uuid: string
}

export default class ReadNotificationController {
   private req: Request<Params>
   private res: Response
   private next: NextFunction
   private readonly notificationService = new NotificationService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as unknown as Request<Params>
      this.res = res
      this.next = next

      this.execute()
   }

   private async execute() {
      const { notification_uuid } = this.req.params

      if (!this.req.session) return this.next(new Error('Session not found'))

      const { user_uuid } = this.req.session

      try {
         await this.notificationService.markAsRead(notification_uuid, user_uuid)
         return this.res.status(200).json()
      } catch (error: unknown) {
         if (!(error instanceof NotificationServiceException)) return this.next(error)

         if (error.name === 'notification_not_found') {
            const exception = ExceptionFactory.notFound(error.message)
            return this.res.status(exception.status).json(exception.toJSON())
         }

         if (error.name === 'not_authorized') {
            const exception = ExceptionFactory.invalidInput(error.message)
            return this.res.status(exception.status).json(exception.toJSON())
         }

         return this.next(error)
      }
   }
}
