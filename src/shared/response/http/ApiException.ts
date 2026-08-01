export interface ExceptionBody<T = any> {
   status: number;
   message: string;
   error_name: string;
   data?: T
}

export default class ApiException<T = any> {
   public readonly status: number
   public readonly error_name: string
   public readonly message: string
   public readonly cause?: Error
   public readonly data?: T

   constructor(body: ExceptionBody, cause?: Error) {
      this.status = body.status
      this.error_name = body.error_name
      this.cause = cause
      this.message = body.message
      this.data = body.data
   }

   public toJSON(): ExceptionBody {
      return {
         status: this.status,
         message: this.message,
         error_name: this.error_name,
         data: this.data
      }
   }
}
