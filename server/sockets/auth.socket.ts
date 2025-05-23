import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { JWT_KEY as secretKey } from '../env';

/*
 * Authentication middleware for socket.io
 */
export function authSocketMiddleware() {
  return (socket: Socket, next: (err?: ExtendedError | undefined) => void) => {
    const token = socket.handshake.auth.token as string;
    if (!token) {
      console.log('🚨[Socket]: Eavesdropping behavior detected!!!');
      return next(
        new Error('Socket authentication error: Missing token') as ExtendedError
      );
    }

    try {
      // Add userId to socket data
      const { userId } = jwt.verify(token, secretKey) as { userId: string };
      socket.data.userId = userId;
      next();
    } catch (err) {
      console.log('🚨[Socket]: Eavesdropping behavior detected!!!');
      next(
        new Error('Socket authentication error: Invalid token') as ExtendedError
      );
    }
  };
}
