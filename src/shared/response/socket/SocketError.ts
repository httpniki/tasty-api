export interface SocketErrorBody {
   message: string
   error_name: string
}

export default class SocketError extends Error {
   public readonly data: SocketErrorBody

   constructor(body: SocketErrorBody) {
      super(body.message)
      this.data = body
   }
}
