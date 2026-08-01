import mongoose from 'mongoose'

import { getTime } from '../shared/utils/get_time'

export default function DBConnection(connectionKey: string): void {
   mongoose.set('strictQuery', true)
   const tryCount = 0

   // while (tryCount < 5) {
   mongoose.connect(
      connectionKey as string,
      { maxPoolSize: 10, autoIndex: true }
   )
      .then(() => console.log(`${getTime()} - Database Connect`))
      .catch((error) => {
         // if (tryCount < 5) {
         //    console.log('Database connection error, retrying...')
         //    tryCount++
         // }
         // if (tryCount === 5) console.log('DB ERROR - ', error)
         console.log('DB ERROR - ', error)

         process.on(
            'uncaughtException',
            async () => await mongoose.connection.close()
         )
      })
   // }
}
