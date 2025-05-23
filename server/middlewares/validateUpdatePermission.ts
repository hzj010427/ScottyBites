import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { IUpdatedUser, IUser } from '../../common/user.interface';
import { UserUtils } from '../utils/userUtils';
import { IAppError } from '../../common/server.responses';

export async function validateUpdatePermission(req: Request, res: Response, next: NextFunction) {
    try {
        const senderId: string = res.locals.userId;
        const userId: string = req.params.userId;
        const fieldToChange: IUpdatedUser | null = req.body;

        const foundUser: IUser | null = await User.getUserByUserId(userId);

        const sender: IUser | null = await User.getUserByUserId(senderId);

        if (!foundUser || !sender) {
            return res.status(404).json({
                type: 'ClientError',
                name: 'UserNotFound',
                message: 'User not found',
            });
        }

        if (!fieldToChange) {
            return res.status(400).json({
                type: 'ClientError',
                name: 'MissingField',
                message: 'No field to update',
            });
        }

        UserUtils.validateUpdatePermission(sender, foundUser, fieldToChange);

        next();
    } catch (err) {
        next(err);
    }
}
