interface NotificationType {
   uuid: string
   user_uuid: string
   type: string
   read: boolean
   reference_uuid: string | null
   message: string
   created_at: Date
}

export default class Notification {
   private uuid: string
   private user_uuid: string
   private type: string
   private read: boolean
   private reference_uuid: string | null
   private message: string
   private created_at: Date

   constructor(data: NotificationType) {
      this.uuid = data.uuid
      this.user_uuid = data.user_uuid
      this.type = data.type
      this.read = data.read
      this.reference_uuid = data.reference_uuid
      this.message = data.message
      this.created_at = data.created_at
   }
}
