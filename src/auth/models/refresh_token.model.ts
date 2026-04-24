import { model, Schema, type Types } from 'mongoose'
import mongooseUniqueValidator from 'mongoose-unique-validator'

export interface IRefreshToken {
   user: Types.ObjectId
   token: string
   parent: string | null
   createdAt: Date
   expiresAt: Date
   revoked: boolean
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
   user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
   token: { type: String, required: true, unique: true },
   parent: { type: String, default: null },
   createdAt: { type: Date, required: true },
   expiresAt: { type: Date, required: true },
   revoked: { type: Boolean, default: false }
}, { timestamps: true })

RefreshTokenSchema.plugin(mongooseUniqueValidator, { message: '{PATH} already exists' })

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const RefreshTokenModel = model<IRefreshToken>('RefreshToken', RefreshTokenSchema)

export default RefreshTokenModel
