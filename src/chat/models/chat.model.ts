import { model, Schema, Types } from 'mongoose'

interface IMessage {
   uuid: string
   user_id: string
   content: string
   timestamp: Date
   read: boolean
}

interface IChat {
   uuid: string
   users: Types.ObjectId[]
   messages: IMessage[]
   created_at: Date
}

const MessageSchema = new Schema<IMessage>({
   uuid: {
      type: String,
      unique: true,
      require: [true, 'Message UUID is required']
   },
   user_id: {
      type: String,
      require: [true, 'User ID is required']
   },
   content: {
      type: String,
      require: [true, 'Message content is required']
   },
   timestamp: {
      type: Date,
      default: Date.now
   },
   read: {
      type: Boolean,
      default: false
   }
})

const ChatSchema = new Schema<IChat>({
   uuid: {
      type: String,
      unique: true,
      require: [true, 'Chat UUID is required']
   },
   users: {
      type: [Types.ObjectId],
      require: [true, 'Users are required']
   },
   created_at: {
      type: Date,
      default: Date.now
   },
   messages: [MessageSchema]
})

ChatSchema.set('toJSON', {
   transform: (_, returnedObject) => {
      delete returnedObject._id
      delete returnedObject.__v
   }
})

const ChatModel = model('chat', ChatSchema)

export default ChatModel
export { ChatSchema, IChat, IMessage, MessageSchema }
