import type { NextFunction, Request, Response } from 'express'

import { Auth } from '@/auth/auth.decorator'

import GetNotificationsController from './controllers/get-notifications.controller'
import ReadNotificationController from './controllers/read-notification.controller'

export default class NotificationController {
   @Auth.consumeAccess()
   public async getNotifications(req: Request, res: Response, next: NextFunction) {
      return new GetNotificationsController(req, res, next)
   }

   @Auth.consumeAccess()
   public async readNotification(req: Request, res: Response, next: NextFunction) {
      return new ReadNotificationController(req, res, next)
   }
}
