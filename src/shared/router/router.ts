import { Router } from 'express'

export class BaseRouter<T, U> {
   public router: Router
   public middleware: T
   public controller: U

   constructor(TMiddleware: new () => T, UController: new () => U) {
      this.router = Router()
      this.middleware = new TMiddleware()
      this.controller = new UController()
      this.routes()
   }

   routes(): void { }
}
