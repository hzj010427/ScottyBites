// Controller serving the athentication page and handling user registration and login
// Note that controllers don't access the DB direcly, only through the models

import {
  IAuth,
  IUser,
  IVerification,
  IAuthenticatedUser,
  IJwtPayload,
} from '../../common/user.interface';
import { User } from '../models/user.model';
import { Profile } from '../models/profile.model';
import Controller from './controller';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_KEY as secretKey, JWT_EXP as tokenExpiry } from '../env';
// import jwt from 'jsonwebtoken';
import * as responses from '../../common/server.responses';
import { UserUtils } from '../utils/userUtils';
import { EmailUtils, EmailType } from '../utils/emailUtils';
import path from 'path';

export default class AuthController extends Controller {
  public constructor(path: string) {
    super(path);
  }

  public initializeRoutes(): void {
    /* Get requests */
    this.router.get('/pages/access', this.authPage);
    this.router.get('/pages/verification', this.verificationPage);

    /* Post requests */
    this.router.post('/apif/validate', this.validate);
    this.router.post('/apif/validate/email', this.validateEmail);
    this.router.post('/apif/verify', this.verify);
    this.router.post('/apif/users/ack', this.acknowledge);
    this.router.post('/api/tokens', this.login);
    this.router.post('/api/users', this.register);
  }

  public async authPage(req: Request, res: Response) {
    // res.redirect('/pages/auth.html');
    res.sendFile(path.resolve('.dist', 'client', 'pages', 'auth.html'));
  }

  public async verificationPage(req: Request, res: Response) {
    res.sendFile(path.resolve('.dist', 'client', 'pages', 'verification.html'));
  }

  public async register(req: Request, res: Response, next: NextFunction) {
    try {
      const credentials: IAuth = req.body;

      const user: User = new User(credentials);

      const newUser: IUser = await user.join();

      const userProfile = new Profile(newUser._id);

      await userProfile.save();

      const successRes: responses.ISuccess = {
        name: 'UserRegistered',
        message: `User ${user.credentials.username} registered successfully`,
        payload: newUser,
      };

      res.status(201).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const credentials: IAuth = req.body;

      const sanitizedCredentials: IAuth =
        await UserUtils.validateUserInformation(credentials);

      await EmailUtils.sendEmail(credentials.email!, EmailType.VERIFICATION);

      const successRes: responses.ISuccess = {
        name: 'UserValidated',
        message: `User validated successfully`,
        payload: sanitizedCredentials,
      };

      res.status(200).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async validateEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const email: string = req.body.email;

      UserUtils.validateEmail(email);

      await EmailUtils.sendEmail(email, EmailType.VERIFICATION);

      const successRes: responses.ISuccess = {
        name: 'UserValidated',
        message: `User validated successfully`,
        payload: email,
      };

      res.status(200).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const verification: IVerification = req.body;

      await User.verifyUser(verification);

      const successRes: responses.ISuccess = {
        name: 'UserVerified',
        message: `User verified successfully`,
        payload: null,
      };

      res.status(200).json(successRes);
    } catch (err) {
      next(err);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction) {
    try {
      const auth: IAuth = req.body;
      const loggedInUser: IUser = await User.login(auth);

      // user verified and active
      // generate token
      const tokenPayload: IJwtPayload = {
        userId: loggedInUser._id,
        password: loggedInUser.credentials.password,
      };
      const signedToken = UserUtils.generateToken(tokenPayload, tokenExpiry);

      const responsePayload: IAuthenticatedUser = {
        user: loggedInUser,
        token: signedToken,
      };

      const successRes: responses.ISuccess = {
        name: 'UserAuthenticated',
        message: `User ${loggedInUser.credentials.username} authenticated successfully`,
        payload: responsePayload,
      };
      res.status(200).json(successRes);
    } catch (error) {
      next(error);
    }
  }

  public async acknowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const auth: IAuth = req.body;

      const updatedUser: IUser = await User.acknowledgeUser(auth.username);

      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }
}
