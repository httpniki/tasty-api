import fs from 'node:fs'
import path from 'path'

export default function createUserFilesFolder() {
   const folderPath = path.join('..', 'user-files')

   try {
      fs.exists(folderPath, (exists) => {
         if (!exists) fs.mkdirSync(folderPath)
      })
   } catch (error) {
      console.error(error)
   }
}
