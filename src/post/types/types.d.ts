import type mongoose from 'mongoose'

export interface IPost {
   _id: mongoose.Types.ObjectId
   content: string
   create_at: Date
   uuid: string
   user: mongoose.Types.ObjectId
   user_uuid: string
}
