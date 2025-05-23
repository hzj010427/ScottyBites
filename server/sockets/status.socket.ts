import { Server, Socket } from 'socket.io';
import { User } from '../models/user.model';

// Map to store offline timeouts
const offlineTimeouts = new Map<string, NodeJS.Timeout>();

export function handleOnlineStatus(socket: Socket, io: Server) {
  console.log(`️[Socket]: A client connected: ${socket.data.userId}`);

  // Clear any pending offline timeout for this user
  const existingTimeout = offlineTimeouts.get(socket.data.userId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    offlineTimeouts.delete(socket.data.userId);
    User.updateOnlineStatus(socket.data.userId, true);
  }

  // Emit current status to all clients
  emitUserStatus(io);

  // Socket disconnection event handler
  socket.on('disconnect', async (reason) => {
    console.log(
      `[Socket]: Client disconnected: ${socket.data.userId} (${reason})`
    );

    // Set a timeout before considering the user truly offline
    const timeout = setTimeout(() => {
      offlineTimeouts.delete(socket.data.userId);
      emitUserStatus(io);
      User.updateOnlineStatus(socket.data.userId, false);
    }, 1000); // 1 second delay before marking offline

    offlineTimeouts.set(socket.data.userId, timeout);
  });
}

// Helper function to emit current user status
async function emitUserStatus(io: Server) {
  try {
    const allUsers = await User.getAllUsers();
    const connectedUserIds = Array.from(io.sockets.sockets.keys())
      .map(socketId => io.sockets.sockets.get(socketId)?.data.userId)
      .filter(Boolean);

    const usersWithRealTimeStatus = allUsers.map(user => ({
      ...user,
      online: connectedUserIds.includes(user._id)
    }));
    io.emit('allUsers', usersWithRealTimeStatus);
  } catch (error) {
    console.error('Failed to update user status:', error);
  }
}
