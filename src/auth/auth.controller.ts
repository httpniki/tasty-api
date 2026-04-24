import { type NextFunction, type Request, type Response } from 'express'

import LoginController from './controllers/login.controller'

export default class AuthController {
   login(req: Request, res: Response, next: NextFunction) {
      return new LoginController(req, res, next)
   }
}
