import type { NextFunction, Request, Response } from 'express'
import multer, { MulterError } from 'multer'

import { ExceptionFactory } from '@/shared/response/http/ExceptionFactory'

export default class PostMiddleware {
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

      return (req: Request, res: Response, next: NextFunction) => {
         upload.fields(fields)(req, res, (err: unknown) => {
            if (err instanceof MulterError && err.code === 'LIMIT_UNEXPECTED_FILE') {
               const hasUknownField = fields.some((f) => f.name !== err.field)

               if (hasUknownField) return next(ExceptionFactory.unexpectedField(err.field))

               return next(ExceptionFactory.maxFileCountExceeded(fields[0].maxCount ?? 1))
            }

            if (err) return next(err)
            return next()
         })
      }
   }
}
