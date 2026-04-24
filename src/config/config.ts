import express from 'express'

export default abstract class ServerConfig {
   readonly PORT: string
   readonly DB_CONNECTION_KEY: string 
   readonly CLIENT_ORIGIN: string
   readonly enviroment = express().get('env')

   constructor() {
      // dotenv.config({ 
      //    path: `.${this.enviroment}.env`
      // })
      // @ts-ignore
      process.loadEnvFile(`.${this.enviroment}.env`) 

      this.PORT = process.env.PORT
      this.DB_CONNECTION_KEY = process.env.DB_CONNECTION_STRING
      this.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN
   }
}
