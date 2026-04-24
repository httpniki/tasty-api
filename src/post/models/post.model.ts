import mongoose, { model, Schema } from 'mongoose'
import mongooseUniqueValidator from 'mongoose-unique-validator'

import { type IPost } from '../types/types'

const posts_schema = new Schema<IPost>({
   content: { type: String, require: true },
   create_at: { type: Date, require: true, default: Date.now },
   uuid: { type: String, require: true, unique: true },
   user: mongoose.Schema.Types.ObjectId,
   user_uuid: { type: String, require: true }
})

posts_schema.set('toJSON', {
   transform: (document, returnedObject) => {
      delete returnedObject._id
      delete returnedObject.__v
   }
})

posts_schema.plugin(mongooseUniqueValidator)

const PostModel = model('Post', posts_schema)

export default PostModel
