import { model, Schema, type Types } from 'mongoose'
import uniqueValidator from 'mongoose-unique-validator'

export interface INotification {
   _id: Types.ObjectId
   uuid: string
   user_uuid: string
   type: 'follow'
   read: boolean
   reference_uuid: string | null
   message: string
   created_at: Date
}

const NotificationSchema = new Schema<INotification>({
   uuid: {
      type: String,
      unique: true,
      required: true
   },
   user_uuid: {
      type: String,
      required: true,
      index: true
   },
   type: {
      type: String,
      required: true,
      enum: ['follow']
   },
   read: {
      type: Boolean,
      default: false
   },
   reference_uuid: {
      type: String,
      default: null
   },
   message: {
      type: String,
      required: true
   },
   created_at: {
      type: Date,
      default: Date.now
   }
})

NotificationSchema.plugin(uniqueValidator, {
   message: '{PATH} is already used'
})

NotificationSchema.set('toJSON', {
   transform: (_, returnedObject) => {
      delete returnedObject._id
      delete returnedObject.__v
   }
})

const NotificationModel = model<INotification>('Notification', NotificationSchema)

export default NotificationModel
