import { type Server } from 'socket.io'
import { type Socket } from 'socket.io'
import { type DefaultEventsMap } from 'socket.io/dist/typed-events'

import BaseSocket from '@/shared/socket/BaseSocket'

export type SocketType = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { user_uuid: string }>

export default class NotificationSocket extends BaseSocket {
   public static instance: NotificationSocket

   constructor(socket: Server) {
      super('notifications', socket)
      if(!NotificationSocket.instance) NotificationSocket.instance = this
      this.initialConnection()
   }

   public static emitToUser(user_uuid: string, event: string, data: unknown) {
      const connection = NotificationSocket.instance?.connections.get(user_uuid)
      if (connection) NotificationSocket.instance?.namespace.to(connection).emit(event, data)
   }

   private initialConnection() {
      this.namespace.on('connection', (io) => {
         const user_uuid = io.data.user_uuid

         io.on('disconnect', () => this.connections.delete(user_uuid))
      })
   }
}
