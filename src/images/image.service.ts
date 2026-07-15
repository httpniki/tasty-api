import { exists, mkdirSync } from 'node:fs'

import crypto from 'crypto'
import { readdir, readFile, unlink, writeFile } from 'fs/promises'
import path from 'path'

export default class ImageService {
   public static readonly folder_pathname = path.join(process.env.USER_FILES_PATH)

   constructor() {
      try {
         exists(ImageService.folder_pathname, (exists) => {
            if (!exists) mkdirSync(ImageService.folder_pathname)
         })
      } catch (error) {
         console.error('Error creating images folder', error)
      }
   }

   public async saveImage(image: File | Express.Multer.File | Blob): Promise<File> {
      let buffer: Buffer | null = null
      let filename = ''
      let mimetype = ''

      if ('buffer' in image) {
         const multerImage = image as Express.Multer.File
         const ext = multerImage.mimetype.split('/')[1]

         mimetype = multerImage.mimetype
         buffer = Buffer.from(multerImage.buffer)
         filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`
      }

      if (image instanceof Blob || image instanceof File) {
         const img = image as Blob | File
         const ext = img.type.split('/')[1]
         const bufferArray = await img.arrayBuffer()

         mimetype = img.type
         buffer = Buffer.from(bufferArray)
         filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`
      }

      await writeFile(path.join(ImageService.folder_pathname, filename), buffer)
      return new File([buffer as unknown as ArrayBuffer], filename, { type: mimetype })
   }

   public async findImage(id: string): Promise<File | null> {
      const files = await readdir(ImageService.folder_pathname)

      for (const filename of files) {
         const currentId = filename.split('.')[0]

         if (currentId === id) {
            const buffer: Buffer<ArrayBuffer> = await readFile(path.join(ImageService.folder_pathname, filename))
            const ext = filename.split('.')[1]
            const mimetype = ImageService.getMimeType(ext)

            return new File([buffer], filename, { type: mimetype })
         }
      }

      return null
   }

   public async deleteImage(id: string): Promise<void> {
      const image = await this.findImage(id)
      if (!image) return

      const filePath = path.join(ImageService.folder_pathname, image.name)
      await unlink(filePath)
   }

   private static getMimeType(ext: string): string {
      const mimeTypes: Record<string, string> = {
         jpg: 'image/jpeg',
         jpeg: 'image/jpeg',
         png: 'image/png',
         webp: 'image/webp'
      }
      return mimeTypes[ext] || 'application/octet-stream'
   }
}
