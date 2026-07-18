import { BaseRouter } from '@/shared/router/router'

import NotificationController from './notification.controller'
import NotificationMiddleware from './notification.middleware'

export default class NotificationRouter extends BaseRouter<NotificationMiddleware, NotificationController> {
   constructor() {
      super(NotificationMiddleware, NotificationController)
   }

   routes(): void {
      this.router.get('/notifications', this.controller.getNotifications)
      this.router.patch('/notifications/:notification_uuid/read', this.controller.readNotification)
   }
}
