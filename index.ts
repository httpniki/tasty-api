import { createServer } from 'node:http'
import path from 'node:path'

import cors from 'cors'
import express, { json, type NextFunction, type Request, type Response } from 'express'
import morgan from 'morgan'
import { Server as WebSocketServer } from 'socket.io'

import AuthRouter from './src/auth/auth.router.js'
import ServerConfig from './src/config/config.js'
import createUserFilesFolder from './src/config/createUserFilesFolder.js'
import DBConnection from './src/config/db_connection.js'
import ImageRouter from './src/images/image.router.js'
import PostRouter from './src/post/post.router.js'
import ApiException from './src/shared/response/http/ApiException.js'
import { ExceptionFactory } from './src/shared/response/http/ExceptionFactory.js'
import { getTime } from './src/shared/utils/get_time.js'
import UserRouter from './src/user/user.router.js'

declare module 'express' {
   interface Request {
      session?: {
         user_id: string
         user_uuid: string
      }
   }
}

class ServerBootstrap extends ServerConfig {
   public app: express.Application = express()
   public httpServer = createServer(this.app)
   public socket = new WebSocketServer(this.httpServer, {
      cors: { origin: this.CLIENT_ORIGIN },
      cookie: true
   })

   constructor() {
      super()

      this.app.disable('x-powered-by')
      this.app.use(cors())
      this.app.use(json())
      this.app.use(express.urlencoded({ extended: true }))

      createUserFilesFolder()

      this.app.use(express.static(path.join('..', 'user-files')))
      this.app.use(morgan('dev'))

      this.app.use('/', this.routers())

      this.app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
         if (error instanceof ApiException) return res.status(error.status).json(error.toJSON())

         console.log('------------------------------------')
         console.log(error)
         console.log('URL: ', req.url)
         console.log('BODY: ', req.body)
         console.log('URL_QUERY: ', req.query)
         console.log('URL_PARAMS: ', req.params)
         console.log('------------------------------------')

         const exception = ExceptionFactory.internalServerError()
         return res.status(exception.status).json(exception.toJSON())
      })

      this.socket.setMaxListeners(0)
      // new Sockets(this.socket)

      this.listen()
   }

   private routers(): express.Router[] {
      return [
         new UserRouter().router,
         new PostRouter().router,
         new AuthRouter().router,
         new ImageRouter().router,
         // new MessageRouter().router
      ]
   }

   private initDB(): void {
      return DBConnection(this.DB_CONNECTION_KEY)
   }

   public listen() {
      console.log(`${getTime()} - ENVIROMENT: ${this.enviroment}`)
      this.initDB()

      return this.httpServer.listen(this.PORT, () =>
         console.log(`${getTime()} - Server running on PORT ${this.PORT}`)
      )
   }
}

const server = new ServerBootstrap()

export default server
