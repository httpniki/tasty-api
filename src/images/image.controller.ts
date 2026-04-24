import type { NextFunction, Request, Response } from 'express'

import GetImageController from './controllers/get-image.controller'

export default class ImageController {
   async getImage(req: Request, res: Response, next: NextFunction) {
      return new GetImageController(req, res, next)
   }
}