// Controller serving the user profile page and handling user account updates

import Controller from './controller';
import { IUpdatedUser, IUser } from '../../common/user.interface';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { UserUtils } from '../utils/userUtils';
import path from 'path';
import { authorize } from '../middlewares/authorize';
import { validateUpdatePermission } from '../middlewares/validateUpdatePermission';
import { IAppError, ISuccess } from '../../common/server.responses';
import { SearchDispatcher } from '../utils/SearchDispatcher';
import { SearchUsers } from '../searchStrategies/SearchUsers';

export default class AccountController extends Controller {
  private searchDispatcher: SearchDispatcher<IUser>;

  public constructor(path: string) {
    super(path);
    this.searchDispatcher = new SearchDispatcher<IUser>();
    const searchUsers = new SearchUsers();
    this.searchDispatcher.setSearchStrategy(searchUsers);
  }

  public initializeRoutes(): void {
    this.router.get('/pages/:userId', this.accountPage);
    this.router.use(authorize); // all routes below require authentication
    this.router.get('/api/users', this.getUsers.bind(this));
    this.router.get('/api/users/:userId', this.getUserInfo);
    this.router.patch(
      '/api/users/:userId',
      validateUpdatePermission,
      this.updateUserInfo
    );
  }

  public async accountPage(req: Request, res: Response) {
    res.sendFile(path.resolve('.dist', 'client', 'pages', 'account.html'));
  }

  public async getUserInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId: string = req.params.userId;
      const user: IUser | null = await User.getUserByUserId(userId);

      if (!user) {
        return res.status(404).json({
          type: 'ClientError',
          name: 'UserNotFound',
          message: 'User not found',
        });
      }

      return res.status(200).json({
        name: 'UserFound',
        message: 'User found successfully',
        payload: user,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.q as string;
      // Query exist, search info
      if (query) {
        const results: IUser[] = await this.searchDispatcher.search(query);
        res.status(200).json({
          name: 'SearchCompleted',
          message: 'User search completed.',
          payload: results,
        } as ISuccess);
      } else {
        // No query, get all users
        const users: IUser[] = await User.getAllUsers();
        return res.status(200).json({
          name: 'UsersFound',
          message: 'Users found successfully',
          payload: users,
        });
      }
    } catch (err) {
      next(err);
    }
  }

  public async updateUserInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId: string = req.params.userId;
      const fieldToChange = req.body as IUpdatedUser;

      const updatedUser = await User.updateUser(userId, fieldToChange);

      Controller.io.emit('updatedUser', updatedUser);

      return res.status(200).json({
        name: 'UserUpdated',
        message: 'User updated successfully',
        payload: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  }
}
