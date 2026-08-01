type Data = { [key: string]: string }

export default class AuthServiceException<TData extends Partial<Data> = Data> extends Error {
   public data: Data

   constructor(name: string, message: string, data?: TData) {
      super(message)
      this.name = name
      this.data = data
   }
}

export class AuthServiceExceptionFactory {
   static readonly validationError = <TData extends Data>(message: string, data: TData): AuthServiceException =>
      new AuthServiceException('auth_validation_error', message, data)
   static readonly invalidAccessToken = <TData extends Data>(message?: string, data?: TData): AuthServiceException =>
      new AuthServiceException('invalid_access_token', message ?? 'Invalid access token', data)
   static readonly expiredAccessToken = <TData extends Data>(message?: string, data?: TData): AuthServiceException =>
      new AuthServiceException('expired_access_token', message ?? 'Expired access token', data)
   static readonly unexpectedError = <TData extends Data>(message: string, data?: TData): AuthServiceException =>
      new AuthServiceException('unexpected_error', message, data)
   static readonly invalidRefreshToken = <TData extends Data>(message?: string, data?: TData): AuthServiceException =>
      new AuthServiceException('invalid_refresh_token', message ?? 'Invalid refresh token', data)
   static readonly expiredRefreshToken = <TData extends Data>(message?: string, data?: TData): AuthServiceException =>
      new AuthServiceException('expired_refresh_token', message ?? 'Expired refresh token', data)
   static readonly tokenAlreadyUsed = <TData extends Data>(message?: string, data?: TData): AuthServiceException =>
      new AuthServiceException('token_already_used', message ?? 'Token already used', data)
   static readonly invalidCredentials = <TData extends Data>(message?: string, data?: TData): AuthServiceException =>
      new AuthServiceException('invalid_credentials', message ?? 'Invalid credentials', data)
   static readonly notFound = <TData extends Data>(message: string, data?: TData): AuthServiceException =>
      new AuthServiceException('not_found', message, data)
}
