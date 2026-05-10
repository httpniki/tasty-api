import { type Namespace, type Server } from 'socket.io'
import { type DefaultEventsMap } from 'socket.io/dist/typed-events'

import AccessTokenService from '@/auth/services/access_token.service'
import { type TokenPayload } from '@/auth/types/types'
import ServiceError from '@/shared/errors/ServiceError'
import { SocketExceptionFactory } from '@/shared/response/socket/SocketExceptionFactory'
import UserService, { type User } from '@/user/services/user.service'

import ChatService, { type Chat } from './services/chat.service'

interface MessageBody {
   message: string
   from: string
   to: string
}

export default class ChatSocket {
   private readonly server: Server
   private namespace: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { user_uuid: string }>
   private connections: Map<string, string> = new Map<string, string>()
   private accessTokenService = new AccessTokenService()
   private userService = new UserService()
   private chatService = new ChatService()

   constructor(socket: Server) {
      this.server = socket
      this.namespace = this.server.of('chat')

      this.namespace.use(async (socket, next) => {
         const token = socket.handshake.auth.token
         let tokenPayload: TokenPayload = null

         try {
            const decodedToken = this.accessTokenService.decodeToken(token)

            if (decodedToken.error_name === 'expired_access_token') {
               const exception = SocketExceptionFactory.expiredAccessToken()
               return next(exception)
            }

            if (decodedToken.error_name === 'invalid_access_token') {
               const exception = SocketExceptionFactory.invalidAccessToken()
               return next(exception)
            }

            tokenPayload = decodedToken.payload
         } catch (err) {
            console.error(err)
            const exception = SocketExceptionFactory.internalServerError()
            return next(exception)
         }

         try {
            const isRevoked = await this.accessTokenService.isTokenRevoked(token)

            if (isRevoked) {
               const exception = SocketExceptionFactory.tokenAlreadyUsed()
               return next(exception)
            }

            await this.accessTokenService.revokeAccessToken(
               token,
               'consumed',
               tokenPayload.jwtId,
               tokenPayload.user_id,
               tokenPayload.exp
            )
         } catch (err) {
            console.error(err)
            const exception = SocketExceptionFactory.internalServerError()
            return next(exception)
         }

         this.connections.set(tokenPayload.user_uuid, socket.id)
         socket.data.user_uuid = tokenPayload.user_uuid
         next()
      })

      this.initialConnection()
   }

   private initialConnection() {
      this.namespace.on('connection', (socket) => {
         const user_uuid = socket.data.user_uuid

         socket.on('send', async ({ message, from, to }: MessageBody) => {
            let current: User | null = null
            let target: User | null = null

            try {
               current = await this.userService.findUser({ uuid: user_uuid })
               target = await this.userService.findUser({ uuid: to })
            } catch (err) {
               console.error(err)
               const exception = SocketExceptionFactory.internalServerError()
               return socket
                  .to(this.connections.get(from))
                  .emit('error', exception.data)
            }

            if (!current) {
               console.error('current user not found')
               const exception = SocketExceptionFactory.internalServerError()
               return socket
                  .to(this.connections.get(from))
                  .emit('error', exception.data)
            }

            if (!target) {
               const exception = SocketExceptionFactory.notFound()
               return socket
                  .to(this.connections.get(from))
                  .emit('error', exception.data)
            }

            let chat: Chat | null = null

            try {
               chat = await this.chatService.findConversation({ user_uuids: [current.uuid, target.uuid] })
               if (!chat) chat = await this.chatService.createConversation(current._id.toString(), target._id.toString())
            } catch (err) {
               if (err instanceof ServiceError) {
                  const exception = { message: err.message, error_name: err.name }
                  return socket
                     .to(this.connections.get(from))
                     .emit('error', exception)
               }

               console.error(err)
               const exception = SocketExceptionFactory.internalServerError()
               return socket
                  .to(this.connections.get(from))
                  .emit('error', exception.data)
            }

            try {
               await this.chatService.addMessage(chat.uuid, { user_id: current.uuid, content: message })
            } catch (err) {
               console.error(err)

               const exception = SocketExceptionFactory.internalServerError()
               return socket
                  .to(this.connections.get(from))
                  .emit('error', exception.data)
            }

            if (this.connections.has(to)) {
               socket
                  .to(this.connections.get(to))
                  .emit('receive', { message, from, to })
            }
         })

         socket.on('disconnect', () => {
            this.connections.delete(user_uuid)
         })
      })
   }
}
