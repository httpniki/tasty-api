import { type Request } from 'express'
import multer from 'multer'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

export default class UserMiddleware {
   processFiles(fields: readonly multer.Field[]) {
      const storage = multer.memoryStorage()
      const mimetypes = ['image/png', 'image/jpg', 'image/jpeg']

      function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
         if (!mimetypes.includes(file.mimetype)) return cb(ExceptionFactory.invalidMimetype('Invalid file type. Only PNG, JPG, JPEG are allowed') as unknown as Error)
         return cb(null, true)
      }

      const upload = multer({
         storage,
         fileFilter: fileFilter,
      })

      return upload.fields(fields)
   }

   // async update_public_profile(...Args: [Request, Response, NextFunction]): Promise<Response | void> {
   //    return await new UpdatePublicProfileMiddleware(...Args).setup()
   // }

   // validate_user_data(req: Request, res: Response, next: NextFunction): Response | null {
   //    return new ValidateUserData().setup(req, res, next)
   // }

   // upload_image(...args: [Request, Response, NextFunction, RequestHandler]) {
   //    return new ValidateImage(...args).setup()
   // }

   // async fetch_image(...args: [Request, Response, NextFunction]): Promise<Response | void> {
   //    return await new FetchImageMiddleware(...args).setup()
   // }

   // async register(...args: [Request, Response, NextFunction]): Promise<Response | null> {
   //    return await new RegisterMiddleware(...args).setup()
   // }
}

