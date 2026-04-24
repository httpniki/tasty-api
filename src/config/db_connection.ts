import mongoose from 'mongoose'

import { getTime } from '../shared/utils/get_time'

export default function DBConnection(connectionKey: string): void {
   mongoose.set('strictQuery', true)

   mongoose.connect(
      connectionKey as string,
      { maxPoolSize: 10 }
   )
      .then(() => {
         console.log(`${getTime()} - Database Connect`)
      })
      .catch(error => {
         console.log('DB ERROR - ', error)
         process.on(
            'uncaughtException',
            async () => await mongoose.connection.close()
         )
      })
}
