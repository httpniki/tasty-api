import { model, Schema } from 'mongoose'

interface IMessage {
   uuid: string
   user_uuid: string
   content: string | null
   timestamp: Date
   read: boolean
   deleted: boolean
   deletedAt: Date | null
}

interface IChat {
   uuid: string
   users: [string, string]
   messages: IMessage[]
   created_at: Date
}

const MessageSchema = new Schema<IMessage>({
   uuid: {
      type: String,
      unique: true,
      require: [true, 'Message UUID is required']
   },
   user_uuid: {
      type: String,
      require: [true, 'User ID is required']
   },
   content: {
      type: String,
      default: null
   },
   timestamp: {
      type: Date,
      default: Date.now
   },
   read: {
      type: Boolean,
      default: false
   },
   deleted: {
      type: Boolean,
      default: false
   },
   deletedAt: {
      type: Date,
      default: null
   }
})

const ChatSchema = new Schema<IChat>({
   uuid: {
      type: String,
      unique: true,
      require: [true, 'Chat UUID is required']
   },
   users: {
      type: [String],
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
