// This is the model for users
// It is used by the controllers to access functionality related users, including database access

import {
  IAuth,
  IUser,
  IVerification,
  IUpdatedUser,
} from '../../common/user.interface';
import { v4 as uuidV4 } from 'uuid';
import DAC from '../db/dac';
import { IAppError } from '../../common/server.responses';
import bcrypt from 'bcrypt';
import { UserUtils } from '../utils/userUtils';
import { EmailUtils } from '../utils/emailUtils';
import { sanitizeText } from '../utils/sanitizeText';
import { dropStopWords } from '../utils/searchUtils';

export class User implements IUser {
  credentials: IAuth;

  _id: string;

  online: boolean;

  agreedToTerms: boolean;

  verified: boolean;

  active: 'active' | 'inactive' | 'suspend';

  role: 'admin' | 'coordinator' | 'member';

  constructor(credentials: IAuth) {
    this.credentials = credentials;
    this.credentials.username = sanitizeText(
      this.credentials.username
    ).toLowerCase();
    this._id = uuidV4();
    this.online = false;
    this.agreedToTerms = false;
    this.verified = true;
    this.active = 'active';
    this.role = 'member';
  }

  async join(): Promise<IUser> {
    this.credentials.password = await bcrypt.hash(
      this.credentials.password,
      10
    );

    const user = await DAC.db.findUserByUsername(this.credentials.username);
    if (user) {
      throw {
        type: 'ClientError',
        name: 'UserExists',
        message: 'User already exists',
      } as IAppError;
    }

    return await DAC.db.saveUser(this);
  }

  // login to ScottyBites with user credentials
  static async login(credentials: IAuth): Promise<IUser> {
    UserUtils.validateCredentials(credentials);

    const sanitizedUsername = sanitizeText(credentials.username).toLowerCase();

    const user = await DAC.db.findUserByUsername(sanitizedUsername);

    // user not found
    if (!user) {
      throw {
        type: 'ClientError',
        name: 'UserNotFound',
        message: 'User not found',
      } as IAppError;
    }

    // user is inactive
    if (user.active === 'inactive') {
      throw {
        type: 'ClientError',
        name: 'UserInactive',
        message: 'User is inactive, cannot login',
      } as IAppError;
    }

    // user not agreedToTerms
    if (user.agreedToTerms === false) {
      throw {
        type: 'ClientError',
        name: 'UserNotAgreedToTerms',
        message: 'Please agree to the terms and conditions',
      } as IAppError;
    }

    const isPwdMatch = await bcrypt.compare(
      credentials.password,
      user.credentials.password
    );
    if (!isPwdMatch) {
      throw {
        type: 'ClientError',
        name: 'IncorrectPassword',
        message: 'Incorrect password',
      } as IAppError;
    }

    const updatedUser = await DAC.db.updateUser({
      ...user,
      online: true,
    } as IUser);

    return updatedUser;
  }

  static async getAllUsers(): Promise<IUser[]> {
    return await DAC.db.findAllUsers();
  }

  static async acknowledgeUser(username: string): Promise<IUser> {
    const user = await User.getUserForUsername(username);
    if (!user) {
      throw {
        type: 'ClientError',
        name: 'UserNotFound',
        message: 'User not found',
      } as IAppError;
    }

    const updatedUser = await DAC.db.updateUser({
      ...user,
      agreedToTerms: true,
    } as IUser);

    return updatedUser;
  }

  static async updateOnlineStatus(
    userId: string,
    onlineStatus: boolean
  ): Promise<void> {
    const user = await DAC.db.findUserByUserId(userId);
    if (!user) {
      throw {
        type: 'ClientError',
        name: 'UserNotFound',
        message: 'User not found',
      } as IAppError;
    }

    await DAC.db.updateUser({
      ...user,
      online: onlineStatus,
    } as IUser);
  }

  static async getAllOnOrOffLineUsernames(
    online: boolean
  ): Promise<{ username: string; userId: string }[]> {
    const users = await DAC.db.findAllUsers();
    const onlineUser = Array.from(users.values())
      .filter((user) => user.online === online)
      .map((user) => structuredClone(user));
    return onlineUser.map((user) => ({
      username: user.credentials.username,
      userId: user._id,
    }));
  }

  static async verifyUser(verification: IVerification): Promise<void> {
    const OTP = verification.OTP;
    const username = verification.username;
    const email = verification.email;

    if (!OTP || !username) {
      throw {
        type: 'ClientError',
        name: 'InvalidVerification',
        message: 'The verification information is incomplete',
      } as IAppError;
    }

    if (!EmailUtils.validateOTP(OTP, email)) {
      throw {
        type: 'ClientError',
        name: 'InvalidOTP',
        message: 'The one-time password is invalid',
      } as IAppError;
    }

    const user = await DAC.db.findUserByUsername(username);

    if (user) {
      await DAC.db.updateUser({
        ...user,
        verified: true,
      } as IUser);
    }
  }

  static async updateUser(
    userId: string,
    fieldToChange: IUpdatedUser
  ): Promise<IUser> {
    const foundUser = (await User.getUserByUserId(userId)) as IUser;

    const appliedUser = await UserUtils.applyFieldUpdates(
      foundUser,
      fieldToChange
    );

    try {
      return await DAC.db.updateUser(appliedUser);
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'FailedUpdateUser',
        message: 'Cannot update user information',
      } as IAppError;
    }
  }

  static async getAllActiveAdmins(): Promise<IUser[]> {
    try {
      return await DAC.db.findAllActiveAdmins();
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'FailedGetAdmins',
        message: 'Cannot get all admins',
      } as IAppError;
    }
  }

  static async getAllUsernames(): Promise<string[]> {
    try {
      const users = await DAC.db.findAllUsers();
      return users.map((user) => user.credentials.username);
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'FailedGetUsernames',
        message: 'Cannot get all usernames',
      } as IAppError;
    }
  }

  static async getUserForUsername(username: string): Promise<IUser | null> {
    // Fetch user by username from the database
    try {
      return await DAC.db.findUserByUsername(username);
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'FailedGetUserByUsername',
        message: 'Cannot get user information',
      } as IAppError;
    }
  }

  static async getUserByUserId(userId: string): Promise<IUser | null> {
    // Fetch user by userId from the database
    try {
      return await DAC.db.findUserByUserId(userId);
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'FailedGetUserById',
        message: 'Cannot get user information',
      } as IAppError;
    }
  }

  public static async search(query: string): Promise<IUser[]> {
    const sanitizedQuery = dropStopWords(sanitizeText(query));
    return await DAC.db.searchUser(sanitizedQuery);
  }
}
