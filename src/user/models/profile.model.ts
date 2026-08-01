import { model, Schema, type Types } from 'mongoose'
import uniqueValidator from 'mongoose-unique-validator'

export interface IProfile {
   _id: Types.ObjectId
   uuid: string
   user_uuid: string
   description: string
   avatar: string
   header: string
   name: string
   posts: {
      uuid: string,
      type: 'post' | 'repost'
      created_at: Date,
      reposted_at?: Date
   }[]
   chats: { uuid: string, users: [string, string] }[]
   follows: string[]
   followers: string[]
   birthday: Date
}

const ProfilePostSchema = new Schema({
   uuid: { type: String, required: true },
   created_at: { type: Date, required: true },
   reposted_at: { type: Date, required: false, default: null },
   type: { type: String, required: true, enum: ['post', 'repost'] }
}, { _id: false })

const ProfileChatSchema = new Schema<IProfile['chats'][number]>({
   uuid: { type: String, required: true },
   users: { type: [String, String], required: true }
}, { _id: false })

export const ProfileSchema = new Schema<IProfile>({
   uuid: {
      type: String,
      unique: true,
      required: true,
   },
   user_uuid: {
      type: String,
      required: true,
   },
   name: {
      type: String,
      required: [true, 'name is required'],
      minlength: [3, 'name must be at least 3 characters'],
      maxlength: [50, 'name must be at most 50 characters']
   },
   description: {
      type: String,
      maxlength: [390, 'bio is too long (limit is 390 characters)']
   },
   avatar: {
      type: String,
      sparse: true
   },
   header: {
      type: String,
      sparse: true,
   },
   posts: [ProfilePostSchema],
   chats: [ProfileChatSchema],
   follows: [String],
   followers: [String],
   birthday: {
      type: Date,
      required: [true, 'birthday is required'],
   }
})

ProfileSchema.plugin(uniqueValidator, {
   message: '{PATH} is already used',
})

const ProfileModel = model<IProfile>('Profile', ProfileSchema)

export default ProfileModel
