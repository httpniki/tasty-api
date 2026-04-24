import { model, Schema, type Types } from 'mongoose'
import uniqueValidator from 'mongoose-unique-validator'

export interface IUser {
   _id: Types.ObjectId
   uuid: string
   username: string
   description: string
   avatar: string
   header: string
   name: string
   email: string
   encrypted_password: string
   password?: string
   posts: { uuid: string, type: string }[]
   follows: string[]
   followers: string[]
   created_at: Date
   birthday: string
}

const UserPostSchema = new Schema({
   uuid: { type: String, required: true },
   type: { type: String, required: true }
}, { _id: false })

export const UserSchema = new Schema<IUser>({
   uuid: {
      type: String,
      unique: true,
      required: true,
   },
   username: {
      type: String,
      unique: true,
      required: [true, 'username is required'],
      minlength: [3, 'username must be at least 3 characters'],
      maxlength: [20, 'username must be at most 20 characters'],
      match: [/^[a-zA-Z0-9.]+$/, 'username can only contain letters, numbers and (.)'],
   },
   name: {
      type: String,
      required: [true, 'name is required'],
      minlength: [3, 'name must be at least 3 characters'],
      maxlength: [50, 'name must be at most 50 characters'],
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
   email: {
      type: String,
      unique: true,
      required: [true, 'email is required'],
      match: [/^(?!\.)(?!.*\.\.)([a-z0-9_'+\-\.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/i, 'Invalid email format. Expected format: example@example.com'],
      maxlength: [255, 'email is too long']
   },
   password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [255, 'Password is too long'],
      select: false
   },
   encrypted_password: {
      type: String,
      required: [true, 'Password is required'],
   },
   posts: [UserPostSchema],
   follows: [String],
   followers: [String],
   created_at: {
      type: Date,
      default: Date.now
   },
   birthday: {
      type: String,
      required: [true, 'birthday is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/, 'Birthday must be in YYYY-MM-DD format.']
   }
})

UserSchema.pre('save', function(next) {
   this.set('password', undefined)
   next()
})

UserSchema.plugin(uniqueValidator, {
   message: '{PATH} is already used',
})

const UserModel = model<IUser>('User', UserSchema)

export default UserModel
