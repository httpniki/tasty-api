interface Data {
   [key: string]: string
}

export default class UserServiceException<TData extends Partial<Data> = Data> extends Error {
   public data: Data

   constructor(name: string, message: string, data?: TData) {
      super(message)
      this.name = name
      this.data = data
   }
}

export class UserServiceExceptionFactory {
   static readonly validationError = <TData extends Data>(message: string, data: TData): UserServiceException =>
      new UserServiceException('validation_error', message, data)
   static readonly unexpectedError = <TData extends Data>(message: string, data?: TData): UserServiceException =>
      new UserServiceException('unexpected_error', message, data)
   static readonly userNotFound = <TData extends Data>(data: TData): UserServiceException =>
      new UserServiceException('user_not_found', 'User not found', data)
   static readonly profileNotFound = <TData extends Data>(data: TData): UserServiceException =>
      new UserServiceException('profile_not_found', 'Profile not found', data)
}
