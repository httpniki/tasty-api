import { model, Schema } from 'mongoose'

export interface IRevokedToken {
   uuid: string
   token: string
   user_uuid: string
   revokedAt: Date
   expiresAt: Date
   reason: 'logout' | 'refresh' | 'admin' | 'expired' | 'consumed'
}

const RevokedTokenSchema = new Schema<IRevokedToken>({
   uuid: { type: String, required: true, unique: true },
   token: { type: String, required: true, unique: true },
   user_uuid: { type: String, required: true },
   revokedAt: { type: Date, default: Date.now },
   expiresAt: { type: Date, required: true },
   reason: { type: String, enum: ['logout', 'refresh', 'admin', 'expired', 'consumed'], default: 'expired' }
}, { timestamps: true })

// RevokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const RevokedTokenModel = model<IRevokedToken>('RevokedToken', RevokedTokenSchema)

export default RevokedTokenModel
