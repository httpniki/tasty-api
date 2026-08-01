interface Data {
   [key: string]: string
}

export default class NotificationServiceException<TData extends Partial<Data> = Data> extends Error {
   public data: Data

   constructor(name: string, message: string, data?: TData) {
      super(message)
      this.name = name
      this.data = data
   }
}

export class NotificationServiceExceptionFactory {
   static readonly validationError = <TData extends Data>(message: string, data: TData): NotificationServiceException =>
      new NotificationServiceException('notification_validation_error', message, data)
   static readonly unexpectedError = <TData extends Data>(message: string, data?: TData): NotificationServiceException =>
      new NotificationServiceException('unexpected_error', message, data)
   static readonly notificationNotFound = <TData extends Data>(data: TData): NotificationServiceException =>
      new NotificationServiceException('notification_not_found', 'Notification not found', data)
   static readonly notAuthorized = <TData extends Data>(data: TData): NotificationServiceException =>
      new NotificationServiceException('not_authorized', 'Not authorized to modify this notification', data)
}
