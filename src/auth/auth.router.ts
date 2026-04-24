import { BaseRouter } from '../shared/router/router'
import AuthController from './auth.controller'
import AuthMiddleware from './auth.middleware'

export default class AuthRouter extends BaseRouter<AuthMiddleware, AuthController> {
   constructor() {
      super(AuthMiddleware, AuthController)
   }

   routes(): void {
      this.router.post('/auth/token',  this.controller.login)
   }
}
