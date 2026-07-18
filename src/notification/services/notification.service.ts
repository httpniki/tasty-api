import { v4 as uuid } from 'uuid'

import NotificationModel, { type INotification } from '../models/notification.model'

export type Notification = Omit<INotification, '_id'>

interface CreateNotificationArgs {
   user_uuid: string
   type: INotification['type']
   reference_uuid?: string
   message: string
}

export default class NotificationService {
   private projection = {
      _id: true,
      uuid: true,
      user_uuid: true,
      type: true,
      read: true,
      reference_uuid: true,
      message: true,
      created_at: true
   }

   /**
      @throws notification_not_found
   **/
   async findByUuid(uuid: string): Promise<Notification | null> {
      const result = await NotificationModel
         .findOne()
         .where({ uuid })
         .select(this.projection)

      return result ? result.toObject() : null
   }

   /**
      @throws invalid_input
   **/
   async createNotification(args: CreateNotificationArgs): Promise<Notification> {
      const notification = new NotificationModel({
         uuid: uuid(),
         user_uuid: args.user_uuid,
         type: args.type,
         reference_uuid: args.reference_uuid ?? null,
         message: args.message,
         read: false,
         created_at: new Date()
      })

      const validationError = notification.validateSync()

      if (validationError) {
         const err = new Error(validationError.message)
         err.name = 'invalid_input'
         throw err
      }

      const result = await notification.save()
      return result.toObject()
   }

   async findNotifications(user_uuid: string, page = 1, limit = 20) {
      let data: Notification[] = []
      let total = 0

      try {
         const [results, count] = await Promise.all([
            NotificationModel
               .find()
               .where({ user_uuid })
               .select(this.projection)
               .sort({ created_at: -1 })
               .skip((page - 1) * limit)
               .limit(limit),
            NotificationModel.countDocuments({ user_uuid })
         ])

         data = results.map((n) => n.toObject())
         total = count
      } catch (error) {
         const err = new Error(error.message)
         err.name = 'database_error'
         throw err
      }

      return {
         paging: {
            page,
            limit,
            total_results: total,
            max_page: Math.ceil(total / limit)
         },
         data
      }
   }

   /**
      @throws notification_not_found
      @throws not_authorized
   **/
   async markAsRead(uuid: string, user_uuid: string): Promise<Notification | null> {
      let notification: Notification | null = null

      try {
         notification = await this.findByUuid(uuid)
      } catch (error) {
         const err = new Error(error.message)
         err.name = 'database_error'
         throw err
      }

      if (!notification) {
         const err = new Error('Notification not found')
         err.name = 'notification_not_found'
         throw err
      }

      if (notification.user_uuid !== user_uuid) {
         const err = new Error('Not authorized to modify this notification')
         err.name = 'not_authorized'
         throw err
      }

      let result: Notification | null = null

      try {
         const updated = await NotificationModel.findOneAndUpdate(
            { uuid },
            { $set: { read: true } },
            { new: true }
         ).select(this.projection)

         result = updated ? updated.toObject() : null
      } catch (error) {
         const err = new Error(error.message)
         err.name = 'database_error'
         throw err
      }

      return result
   }
}
