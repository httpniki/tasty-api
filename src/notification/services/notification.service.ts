import { Error as MongooseError } from 'mongoose'
import { v4 as uuid } from 'uuid'

import { NotificationServiceExceptionFactory } from '../errors/NotificationServiceException'
import NotificationModel, { type INotification } from '../models/notification.model'

export type Notification = Omit<INotification, '_id'>

interface CreateNotificationArgs {
   user_uuid: string
   type: INotification['type']
   reference_uuid?: string
   message: string
}

interface Paging {
   page: number
   limit: number
   total_results: number
   max_page: number
}

interface NotificationsWithPaging {
   data: Notification[]
   paging: Paging
}

export default class NotificationService {
   private projection = {
      uuid: true,
      user_uuid: true,
      type: true,
      read: true,
      reference_uuid: true,
      message: true,
      created_at: true
   }

   async findNotification(uuid: string): Promise<Notification> {
      const result = await NotificationModel
         .findOne()
         .where({ uuid })
         .select(this.projection)

      if (!result) throw NotificationServiceExceptionFactory.notificationNotFound({ uuid })

      return {
         uuid: result.uuid,
         user_uuid: result.user_uuid,
         type: result.type,
         read: result.read,
         reference_uuid: result.reference_uuid,
         message: result.message,
         created_at: result.created_at
      }
   }

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

      const error = await notification
         .validate()
         .catch((err: MongooseError.ValidationError) => Object.values(err.errors)[0])

      if (error && error instanceof MongooseError.ValidatorError) throw NotificationServiceExceptionFactory.validationError(error.message, { [error.path]: error.message })
      if (error && error instanceof MongooseError.CastError) throw error

      const result = await notification.save()

      return {
         uuid: result.uuid,
         user_uuid: result.user_uuid,
         type: result.type,
         read: result.read,
         reference_uuid: result.reference_uuid,
         message: result.message,
         created_at: result.created_at
      }
   }

   async findNotifications(user_uuid: string, page = 1, limit = 20): Promise<NotificationsWithPaging> {
      const [results, totalResults] = await Promise.all([
         NotificationModel
            .find()
            .where({ user_uuid })
            .select(this.projection)
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
         NotificationModel.countDocuments({ user_uuid })
      ])

      return {
         paging: {
            page,
            limit,
            total_results: totalResults,
            max_page: Math.ceil(totalResults / limit)
         },
         data: results.map((n) => ({
            uuid: n.uuid,
            user_uuid: n.user_uuid,
            type: n.type,
            read: n.read,
            reference_uuid: n.reference_uuid,
            message: n.message,
            created_at: n.created_at
         }))
      }
   }

   async markAsRead(uuid: string, user_uuid: string): Promise<Notification> {
      const notification = await NotificationModel
         .findOne()
         .where({ uuid })
         .select(this.projection)

      if (!notification) throw NotificationServiceExceptionFactory.notificationNotFound({ uuid })

      if (notification.user_uuid !== user_uuid) {
         throw NotificationServiceExceptionFactory.notAuthorized({ notification_uuid: uuid })
      }

      const result = await NotificationModel
         .findOneAndUpdate({ runValidators: true })
         .where({ uuid })
         .set({ read: true })
         .select(this.projection)

      return {
         uuid: result.uuid,
         user_uuid: result.user_uuid,
         type: result.type,
         read: result.read,
         reference_uuid: result.reference_uuid,
         message: result.message,
         created_at: result.created_at
      }
   }
}
