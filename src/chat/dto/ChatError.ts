export enum ErrorName {
   EXPIRED_ACCESS_TOKEN = 'EXPIRED_ACCESS_TOKEN',
   INVALID_ACCESS_TOKEN = 'INVALID_ACCESS_TOKEN',
   INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
   TOKEN_ALREADY_USED = 'TOKEN_ALREADY_USED',
   NOT_FOUND = 'NOT_FOUND',
   INVALID_INPUT = 'INVALID_INPUT'
}

export type ChatErrorPayload = {
   name: ErrorName
   message: string
}

export default class ChatError<E = unknown> implements ChatErrorPayload {
   private _name?: ErrorName
   private _message?: string
   private _cause?: E

   constructor(name?: ErrorName, message?: string, error?: E) {
      this._name = name
      this._message = message
      this._cause = error
      if (error) console.log(error)
   }

   public get name(): ErrorName | undefined {
      return this._name
   }

   public set name(value: ErrorName) {
      this._name = value
   }

   public get message(): string | undefined {
      return this._message
   }

   public set message(value: string) {
      this._message = value
   }

   private validate(): { name: ErrorName; message: string } {
      if (!this._name) throw new Error('name must be set')
      if (!this._message) throw new Error('message must be set')
      return { name: this._name, message: this._message }
   }

   public toJSON(): ChatErrorPayload {
      return this.validate()
   }

   public toNativeError(): Error & ChatErrorPayload {
      const { name, message } = this.validate()
      const error = new Error(message, { cause: this._cause }) as Error & ChatErrorPayload
      error.name = name
      return error
   }
}
