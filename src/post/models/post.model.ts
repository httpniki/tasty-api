import type mongoose from 'mongoose'
import { model, Schema } from 'mongoose'
import mongooseUniqueValidator from 'mongoose-unique-validator'

import UserModel from '@/user/models/user.model'

export interface IPost {
   _id: mongoose.Types.ObjectId
   content: string
   created_at: Date
   uuid: string
   user: mongoose.Types.ObjectId
   user_uuid: string
   images: string[]
}

const post_schema = new Schema<IPost>({
   content: { type: String, require: true },
   created_at: { type: Date, require: true, default: Date.now },
   uuid: { type: String, require: true, unique: true },
   user_uuid: { type: String, require: true },
   images: {
      type: [String],
      default: [],
      validate: {
         validator: (v: string[]) => v.length <= 4,
         message: 'A post can have at most 4 images',
         name: 'too_many_images'
      }
   }
})

post_schema.set('toJSON', {
   transform: (document, returnedObject) => {
      delete returnedObject._id
      delete returnedObject.__v
   }
})

post_schema.post('findOneAndDelete', async function(doc) {
   if (!doc) return

   await UserModel.updateMany(
      { posts: { $elemMatch: { uuid: doc.uuid } } },
      { $pull: { posts: { uuid: doc.uuid } } }
   )
})

post_schema.plugin(mongooseUniqueValidator)

const PostModel = model('Post', post_schema)

export default PostModel
