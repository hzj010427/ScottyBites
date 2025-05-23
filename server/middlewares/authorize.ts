import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_KEY as secretKey } from '../env';
import { IJwtPayload } from '../../common/user.interface';

/**
 * JWT token authorization middleware
 */
export function authorize(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        type: 'ClientError',
        name: 'NoToken',
        message: 'No token provided',
      });
    }
    
    const payload = jwt.verify(token, secretKey) as IJwtPayload;
    res.locals.userId = payload.userId;
    next();
  } catch (err) {
    next(err);
  }
}
