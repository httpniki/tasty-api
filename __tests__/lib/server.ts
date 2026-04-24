import mongoose from 'mongoose'
import request from 'supertest'

import server from '../../index'

export default class TestServer {
   public server = server
   public app = this.server.app
   public fetch = request(this.app)

   public async clearDatabase(): Promise<void> {
      if (mongoose.connection.db) {
         await mongoose.connection.db.dropDatabase()
      }
   }

   public async closeConnection(): Promise<void> {
      await mongoose.connection.close()
   }
}
