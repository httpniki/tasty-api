import { type Namespace, type Server } from 'socket.io'
import { type Socket } from 'socket.io'
import { type DefaultEventsMap } from 'socket.io/dist/typed-events'

import AccessTokenService from '@/auth/services/access_token.service'
import { type TokenPayload } from '@/auth/types/types'
import ChatError, { ErrorName } from '@/chat/dto/ChatError'

import DeleteMessageEvent from './socket/events/delete-message.socket'
import ReadMessageEvent from './socket/events/read-message.socket'
import SendMessageEvent from './socket/events/send-message.socket'

export type SocketType = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { user_uuid: string }>

export default class ChatSocket {
   private readonly server: Server
   private namespace: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { user_uuid: string }>
   private connections: Map<string, string> = new Map<string, string>()
   private accessTokenService = new AccessTokenService()

   constructor(socket: Server) {
      this.server = socket
      this.namespace = this.server.of('chat')

      this.namespace.use(async (socket, next) => {
         const token = socket.handshake.auth.token
         let tokenPayload: TokenPayload = null

         try {
            const decodedToken = this.accessTokenService.decodeToken(token)

            if (decodedToken.error_name === 'expired_access_token') {
               const err = new ChatError(ErrorName.EXPIRED_ACCESS_TOKEN, 'Expired access token')
               return next(err.toNativeError())
            }

            if (decodedToken.error_name === 'invalid_access_token') {
               const err = new ChatError(ErrorName.INVALID_ACCESS_TOKEN, 'Invalid access token')
               return next(err.toNativeError())
            }

            tokenPayload = decodedToken.payload
         } catch (err: unknown) {
            const chatError = new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error', err)
            return next(chatError.toNativeError())
         }

         try {
            const isRevoked = await this.accessTokenService.isTokenRevoked(token)

            if (isRevoked) {
               const err = new ChatError(ErrorName.TOKEN_ALREADY_USED, 'Token already used')
               return next(err.toNativeError())
            }

            await this.accessTokenService.revokeAccessToken(
               token,
               'consumed',
               tokenPayload.jwtId,
               tokenPayload.user_id,
               tokenPayload.exp
            )
         } catch (err: unknown) {
            const chatError = new ChatError(ErrorName.INTERNAL_SERVER_ERROR, 'Internal Server Error', err)
            return next(chatError.toNativeError())
         }

         this.connections.set(tokenPayload.user_uuid, socket.id)
         socket.data.user_uuid = tokenPayload.user_uuid
         next()
      })

      this.initialConnection()
   }

   private initialConnection() {
      this.namespace.on('connection', (io) => {
         const user_uuid = io.data.user_uuid

         io.on('message:send', async (body: ConstructorParameters<typeof SendMessageEvent>[0]) => new SendMessageEvent(body, io, this.connections))
         io.on('message:read', (body: ConstructorParameters<typeof ReadMessageEvent>[0]) => new ReadMessageEvent(body, io, this.connections))
         io.on('message:delete', (body: ConstructorParameters<typeof DeleteMessageEvent>[0]) => new DeleteMessageEvent(body, io, this.connections))
         io.on('disconnect', () => this.connections.delete(user_uuid))
      })
   }
}
