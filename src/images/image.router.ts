import { BaseRouter } from '../shared/router/router'
import ImageController from './image.controller'
import ImageMiddleware from './image.middleware'

export default class ImageRouter extends BaseRouter<ImageMiddleware, ImageController> {
   constructor() {
      super(ImageMiddleware, ImageController)
   }

   routes(): void {
      this.router.get('/images/:image_id', this.controller.getImage)
   }
}