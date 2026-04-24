import { type JwtPayload } from 'jsonwebtoken'

export interface TokenOptions {
   expiresIn: number
}

export interface TokenBody {
   user_id: IUser['_id'] | string
   user_uuid: IUser['uuid'] | string
}

export type TokenPayload = JwtPayload & {
   jwtId: string
   exp: number
   iat: number
} & TokenBody
