import { model, Schema, type Types } from 'mongoose'

export interface IRevokedToken {
   uuid: string
   _id: Types.ObjectId
   token: string
   user: Types.ObjectId
   revokedAt: Date
   expiresAt: Date
   reason: 'logout' | 'refresh' | 'admin'
}

const RevokedTokenSchema = new Schema<IRevokedToken>({
   uuid: { type: String, required: true, unique: true },
   token: { type: String, required: true, unique: true },
   user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
   revokedAt: { type: Date, default: Date.now },
   expiresAt: { type: Date, required: true },
   reason: { type: String, enum: ['logout', 'refresh', 'admin'], default: 'logout' }
}, { timestamps: true })

RevokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const RevokedTokenModel = model<IRevokedToken>('RevokedToken', RevokedTokenSchema)

export default RevokedTokenModel
