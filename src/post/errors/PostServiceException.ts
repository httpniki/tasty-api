type Data = { [key: string]: string }

export default class PostServiceException<TData extends Partial<Data> = Data> extends Error {
   public data: Data

   constructor(name: string, message: string, data?: Data) {
      super(message)
      this.name = name
      this.data = data
   }
}

export class PostServiceExceptionFactory {
   static readonly validationError = <TData extends Data>(message: string, data: TData): PostServiceException =>
      new PostServiceException('post_validation_error', message, data)
   static readonly unexpectedError = <TData extends Data>(message: string, data?: TData): PostServiceException =>
      new PostServiceException('unexpected_error', message, data)
   static readonly userNotFound = <TData extends Data>(data: TData): PostServiceException =>
      new PostServiceException('user_not_found', 'User not found', data)
   static readonly profileNotFound = <TData extends Data>(data: TData): PostServiceException =>
      new PostServiceException('profile_not_found', 'Profile not found', data)
   static readonly postNotFound = <TData extends Data>(data: TData): PostServiceException =>
      new PostServiceException('post_not_found', 'Post not found', data)
}
