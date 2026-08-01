import type { NextFunction, Request, Response } from 'express'
import path from 'path'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

import ImageService from '../image.service'

export default class GetImageController {
   private req: Request<{ image_id: string }>
   private res: Response
   private next: NextFunction
   private readonly imageService = new ImageService()

   constructor(req: Request, res: Response, next: NextFunction) {
      this.req = req as Request<{ image_id: string }>
      this.res = res
      this.next = next
      this.execute()
   }

   private async execute() {
      const { image_id } = this.req.params
      let pathname: string = ''

      try {
         const image = await this.imageService.findImage(image_id)

         if (!image) {
            const exception = ExceptionFactory.notFound('Image not found')
            return this.res.status(exception.status).json(exception.toJSON())
         }

         pathname = path.join(ImageService.folder_pathname, image.name)
      } catch (error: unknown) {
         return this.next(error)
      }

      return this.res.status(200).sendFile(pathname)
   }
}
