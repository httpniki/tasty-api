interface Data {
   [key: string]: string
}

export default class ProfileServiceException<TData extends Partial<Data> = Data> extends Error {
   public data: Data

   constructor(name: string, message: string, data?: TData) {
      super(message)
      this.name = name
      this.data = data
   }
}

export class ProfileServiceExceptionFactory {
   static readonly validationError = <TData extends Data>(message: string, data: TData): ProfileServiceException =>
      new ProfileServiceException('validation_error', message, data)
   static readonly unexpectedError = <TData extends Data>(message: string, data?: TData): ProfileServiceException =>
      new ProfileServiceException('unexpected_error', message, data)
   static readonly userNotFound = <TData extends Data>(data: TData): ProfileServiceException =>
      new ProfileServiceException('user_not_found', 'User not found', data)
   static readonly profileNotFound = <TData extends Data>(data: TData): ProfileServiceException =>
      new ProfileServiceException('profile_not_found', 'Profile not found', data)
}
