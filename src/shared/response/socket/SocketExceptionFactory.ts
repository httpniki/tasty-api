import SocketError from './SocketError'

export class SocketExceptionFactory {
   static readonly expiredAccessToken = (): SocketError =>
      new SocketError({ message: 'Expired access token', error_name: 'expired_access_token' })

   static readonly invalidAccessToken = (): SocketError =>
      new SocketError({ message: 'Invalid access token', error_name: 'invalid_access_token' })

   static readonly internalServerError = (): SocketError =>
      new SocketError({ message: 'Internal Server Error', error_name: 'INTERNAL_SERVER_ERROR' })

   static readonly tokenAlreadyUsed = (): SocketError =>
      new SocketError({ message: 'Token already used', error_name: 'token_already_used' })

   static readonly notFound = (message: string = 'User not found'): SocketError =>
      new SocketError({ message, error_name: 'not_found' })

   static readonly invalidInput = (message: string = 'Invalid input'): SocketError =>
      new SocketError({ message, error_name: 'invalid_input' })
}