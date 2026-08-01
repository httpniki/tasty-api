interface Data {
   [key: string]: string | string[]
}

export default class ChatServiceException<TData extends Partial<Data> = Data> extends Error {
   public data: Data

   constructor(name: string, message: string, data?: TData) {
      super(message)
      this.name = name
      this.data = data
   }
}

export class ChatServiceExceptionFactory {
   static readonly validationError = <TData extends Data>(message: string, data: TData): ChatServiceException =>
      new ChatServiceException('chat_validation_error', message, data)
   static readonly unexpectedError = <TData extends Data>(message: string, data?: TData): ChatServiceException =>
      new ChatServiceException('unexpected_error', message, data)
   static readonly userNotFound = <TData extends Data>(data: TData): ChatServiceException =>
      new ChatServiceException('user_not_found', 'User not found', data)
   static readonly profileNotFound = <TData extends Data>(data: TData): ChatServiceException =>
      new ChatServiceException('profile_not_found', 'Profile not found', data)
   static readonly chatNotFound = <TData extends Data>(data: TData): ChatServiceException =>
      new ChatServiceException('chat_not_found', 'Chat not found', data)
   static readonly messageNotFound = <TData extends Data>(data: TData): ChatServiceException =>
      new ChatServiceException('message_not_found', 'Message not found', data)
   static readonly timeExpired = <TData extends Data>(data: TData): ChatServiceException =>
      new ChatServiceException('time_expired', 'Message can only be deleted within 15 minutes', data)
}
