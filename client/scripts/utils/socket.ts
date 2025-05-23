import { io, Socket } from 'socket.io-client';
import {
  ServerToClientEvents,
  ClientToServerEvents,
} from '../../../common/socket.interface';

const token = localStorage.getItem('token');

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  auth: { token: token },
});

export function forceSocketReconnect() {
  socket.close();
  socket.connect();
}