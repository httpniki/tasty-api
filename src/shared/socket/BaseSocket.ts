import { type Namespace, type Server } from 'socket.io'
import { type DefaultEventsMap } from 'socket.io/dist/typed-events'

import AccessTokenService from '@/auth/services/access_token.service'
import { type TokenPayload } from '@/auth/types/types'

enum AuthenticationError {
   EXPIRED_ACCESS_TOKEN = 'EXPIRED_ACCESS_TOKEN',
   INVALID_ACCESS_TOKEN = 'INVALID_ACCESS_TOKEN',
   TOKEN_ALREADY_USED = 'TOKEN_ALREADY_USED',
}

enum ClientError {
   INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
   NOT_FOUND = 'NOT_FOUND',
   INVALID_INPUT = 'INVALID_INPUT'
}

export default abstract class BaseSocket {
   public connections: Map<string, string> = new Map<string, string>()
   public namespace: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { user_uuid: string }>
   public accessTokenService = new AccessTokenService()

   constructor(namespace: string, socket: Server) {
      this.namespace = socket.of(namespace)

      this.namespace.use(async (socket, next) => {
         await this.consumeAccess(socket.handshake.auth.token)
            .then(tokenPayload => {
               this.connections.set(tokenPayload.user_uuid, socket.id)
               socket.data.user_uuid = tokenPayload.user_uuid
               next()
            })
            .catch(next)
      })
   }

   private async consumeAccess(token: string) {
      let tokenPayload: TokenPayload = null

      try {
         const decodedToken = this.accessTokenService.decodeToken(token)

         if (decodedToken.error_name === 'expired_access_token') {
            const err = new Error('Expired access token')
            err.name = AuthenticationError.EXPIRED_ACCESS_TOKEN
            throw err
         }

         if (decodedToken.error_name === 'invalid_access_token') {
            const err = new Error('Invalid access token')
            err.name = AuthenticationError.INVALID_ACCESS_TOKEN
            throw err
         }

         tokenPayload = decodedToken.payload
      } catch (error: unknown) {
         const err = new Error('Internal Server Error', error)
         err.name = ClientError.INTERNAL_SERVER_ERROR
         throw err
      }

      try {
         const isRevoked = await this.accessTokenService.isTokenRevoked(token)

         if (isRevoked) {
            const err = new Error('Token already used')
            err.name = AuthenticationError.TOKEN_ALREADY_USED
            throw err
         }

         await this.accessTokenService.revokeAccessToken(
            token,
            'consumed',
            tokenPayload.jwtId,
            tokenPayload.user_id,
            tokenPayload.exp
         )
      } catch (error: unknown) {
         const err = new Error('Internal Server Error', error)
         err.name = ClientError.INTERNAL_SERVER_ERROR
         throw err
      }

      return tokenPayload
   }
}
