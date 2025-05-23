import { Server, Socket } from 'socket.io';
import { Profile } from '../models/profile.model';

/*
 * socket event to add socket to corresponding rooms for new notifications
 */
export function handleNotificationRooms(socket: Socket, _: Server) {
  // Get all following user's id
  Profile.getFollowingIds(socket.data.userId)
    .then((followingIds) => {
      // Add socket to each room with room name as user id
      followingIds.forEach((id) => {
        socket.join(id);
      });
      console.log(
        `[Socket]: ${socket.data.userId} joined rooms: ${followingIds.join(
          ', '
        )}`
      );
    })
    .catch((error) => {
      console.error('[Socket] Failed to set up notification rooms:', error);
    });
}
