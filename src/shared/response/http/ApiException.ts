export interface ExceptionBody {
   status: number;
   message: string;
   error_name: string;
}

export default class ApiException {
   public readonly status: number
   public readonly error_name: string
   public readonly message: string
   public readonly cause?: Error

   constructor(body: ExceptionBody, cause?: Error) {
      this.status = body.status
      this.error_name = body.error_name
      this.cause = cause
      this.message = body.message
   }

   public toJSON(): ExceptionBody {
      return {
         status: this.status,
         message: this.message,
         error_name: this.error_name
      }
   }
}
