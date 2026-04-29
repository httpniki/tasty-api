export enum ServiceErrorName {
   NotFound = 'NOT_FOUND',
   InvalidInput = 'INVALID_INPUT',
   Conflict = 'CONFLICT',
   DatabaseError = 'DATABASE_ERROR',
   Unexpected = 'UNEXPECTED'
}

export default class ServiceError<T> extends Error {
   public readonly name: ServiceErrorName
   public readonly cause?: Error
   public readonly data?: T

   constructor(name: ServiceErrorName, message: string, cause?: Error, data?: T) {
      super(message, { cause })
      this.name = name
      this.data = data
   }
}
