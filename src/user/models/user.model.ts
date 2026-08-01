import { model, Schema, type Types } from 'mongoose'
import uniqueValidator from 'mongoose-unique-validator'

import AuthService from '@/auth/services/auth.service'

export interface IUser {
   _id: Types.ObjectId
   uuid: string
   username: string
   email: string
   encrypted_password: string
   password?: string
   created_at: Date,
   status?: 'ACTIVE'  /* | 'PENDING_ONBOARDING' */
}

export const UserSchema = new Schema<IUser>({
   uuid: {
      type: String,
      unique: true,
      required: true,
   },
   username: {
      type: String,
      unique: true,
      minlength: [3, 'username must be at least 3 characters'],
      maxlength: [20, 'username must be at most 20 characters'],
      match: [/^[a-zA-Z0-9.]+$/, 'username can only contain letters, numbers and (.)'],
      sparse: true,
      required: [true, 'username is required'],
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
      type: String
   },
   created_at: {
      type: Date,
      default: Date.now
   },
   status: {
      type: String,
      enum: ['ACTIVE'],
      default: 'ACTIVE',
      required: true
   }
})

UserSchema.pre('save', async function(next) {
   if (!this.isModified('password') || !this.password) return next()

   try {
      this.encrypted_password = await new AuthService()
         .hashPassword(this.password)
         .then((hash) => hash)

      this.set('password', undefined)
      next()
   } catch (err: any) {
      next(err)
   }
})

UserSchema.plugin(uniqueValidator, {
   message: '{PATH} is already used',
})

const UserModel = model<IUser>('User', UserSchema)

export default UserModel
