import {
  IAuth,
  IUser,
  IUpdatedUser,
  IJwtPayload,
} from '../../common/user.interface';
import { User } from '../models/user.model';
import Controller from '../controllers/controller';
import DAC from '../db/dac';
import bcrypt from 'bcrypt';
import { IAppError } from '../../common/server.responses';
import { EmailUtils, EmailType } from './emailUtils';
import { sanitizeText } from './sanitizeText';
import jwt from 'jsonwebtoken';
import { JWT_KEY as secretKey, JWT_EXP as tokenExpiry } from '../env';

export class UserUtils {
  /**
   * A dispatcher function to apply the updates to the user object
   * @param user The user object to update
   * @param updates The updates to apply
   * @returns The updated user object
   */
  public static async applyFieldUpdates(
    user: IUser,
    updates: IUpdatedUser
  ): Promise<IUser> {
    let updatedUser = { ...user };
    const errors: { field: string; message: string }[] = [];

    for (const [key, value] of Object.entries(updates)) {
      try {
        switch (key) {
          case 'email':
            updatedUser = this.applyEmail(updatedUser, value);
            break;
          case 'username':
            updatedUser = await this.applyUsername(updatedUser, value);
            break;
          case 'password':
            updatedUser = await this.applyPassword(updatedUser, value);
            break;
          case 'online':
            updatedUser = await this.applyOnlineStatus(updatedUser, value);
            break;
          case 'agreedToTerms':
            updatedUser = this.applyAgreedToTerms(updatedUser, value);
            break;
          case 'active':
            updatedUser = await this.applyActive(updatedUser, value);
            break;
          case 'role':
            updatedUser = await this.applyRole(updatedUser, value);
            break;
          default:
            throw new Error(`Invalid field: ${key}`);
        }
      } catch (error) {
        errors.push({ field: key, message: (error as Error).message });
      }
    }

    if (errors.length > 0) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateUser',
        message: JSON.stringify(errors),
      } as IAppError;
    }

    return updatedUser;
  }

  /**
   * Validate the user information including username, pwd, and email.
   */
  public static async validateUserInformation(
    credentials: IAuth
  ): Promise<IAuth> {
    const sanitizedUsername = sanitizeText(credentials.username).toLowerCase();

    await this.validateUsername(sanitizedUsername);
    this.validatePassword(credentials.password);
    this.validateEmail(credentials.email);

    const sanitizedCredentials: IAuth = {
      username: sanitizedUsername,
      password: credentials.password,
      email: credentials.email,
    };

    return sanitizedCredentials;
  }

  /**
   * Validate the credentials by checking the presence of username and password
   */
  public static validateCredentials(credentials: IAuth): void {
    if (!credentials.username) {
      throw {
        type: 'ClientError',
        name: 'MissingUsername',
        message: 'Missing required information: username',
      } as IAppError;
    }

    if (!credentials.password) {
      throw {
        type: 'ClientError',
        name: 'MissingPassword',
        message: 'Missing required information: password',
      } as IAppError;
    }
  }

  /**
   * Validate the update permission based on the sender and target user
   */
  public static validateUpdatePermission(
    sender: IUser,
    targetUser: IUser,
    fieldToChange: IUpdatedUser
  ): void {
    const errors: { field: string; message: string }[] = [];

    const rules: Record<
      keyof IUpdatedUser,
      (sender: IUser, targetUser: IUser) => boolean
    > = {
      active: (s, t) =>
        (s.role === 'admin' || s._id === t._id) && s.active === 'active',
      role: (s) => s.role === 'admin',
      username: (s, t) => s.role === 'member' && s._id === t._id,
      email: (s, t) => s.role === 'member' && s._id === t._id,
      password: (s, t) => s.role === 'admin' || s._id === t._id,
      verified: (s) => true,
      online: () => true,
      agreedToTerms: () => true,
    };

    for (const key of Object.keys(fieldToChange) as (keyof IUpdatedUser)[]) {
      if (!rules[key]?.(sender, targetUser)) {
        errors.push({
          field: key,
          message: `Permission denied: You cannot update ${key}.`,
        });
      }
    }

    if (errors.length > 0) {
      throw {
        type: 'ClientError',
        name: 'ForbiddenRequest',
        message: JSON.stringify(errors),
      } as IAppError;
    }
  }

  /**
   * Validate the username by checking its length and uniqueness
   */
  public static async validateUsername(username: string): Promise<void> {
    if (username.length < 4) {
      throw {
        type: 'ClientError',
        name: 'InvalidUsername',
        message: 'The username must be at least 4 characters long',
      } as IAppError;
    }

    const existingUsernames = await User.getAllUsernames();
    const reservedUsernames = await DAC.db.findReservedUsernames();

    if (existingUsernames.includes(username)) {
      throw {
        type: 'ClientError',
        name: 'InvalidUsername',
        message: 'The username is already taken',
      } as IAppError;
    }

    if (reservedUsernames.includes(username)) {
      throw {
        type: 'ClientError',
        name: 'InvalidUsername',
        message: 'The username is reserved',
      } as IAppError;
    }
  }

  /**
   * Validate the password by checking its length
   */
  public static validatePassword(password: string): void {
    if (password.length < 4) {
      throw {
        type: 'ClientError',
        name: 'InvalidPassword',
        message: 'The password must be at least 4 characters long',
      } as IAppError;
    }
  }

  /**
   * Validate the email by checking its format and domain
   */
  public static validateEmail(email: string | undefined): void {
    if (email) {
      if (!email.includes('@')) {
        throw {
          type: 'ClientError',
          name: 'InvalidEmail',
          message: 'The email address is invalid',
        } as IAppError;
      }

      const emailRegex = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)*cmu\.edu$/;
      if (!emailRegex.test(email)) {
        throw {
          type: 'ClientError',
          name: 'InvalidEmail',
          message: 'The email address must belong to the CMU domain',
        } as IAppError;
      }
    }
  }

  public static generateToken(
    tokenPayload: IJwtPayload,
    expiration: string
  ): string {
    const signedToken =
      expiration === 'never'
        ? jwt.sign(tokenPayload, secretKey)
        : jwt.sign(tokenPayload, secretKey, { expiresIn: tokenExpiry });

    return signedToken;
  }

  /**
   * Apply the online status update to the user object
   */
  private static async applyOnlineStatus(
    user: IUser,
    isOnline: boolean
  ): Promise<IUser> {
    try {
      await User.updateOnlineStatus(user._id, isOnline);

      const users: IUser[] = await DAC.db.findAllUsers();

      Controller.io.emit('allUsers', users);

      user.online = isOnline;

      return user;
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'FailedUpdateOnlineStatus',
        message: (error as Error).message,
      } as IAppError;
    }
  }

  /**
   * Apply the agreedToTerms update to the user object
   */
  private static applyAgreedToTerms(user: IUser, isAgreed: boolean): IUser {
    try {
      user.agreedToTerms = isAgreed;
      return user;
    } catch (error) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateAgreedToTerms',
        message: (error as Error).message,
      } as IAppError;
    }
  }

  /**
   * Apply the active status update to the user object
   */
  private static async applyActive(
    user: IUser,
    value: 'active' | 'inactive' | 'suspend'
  ): Promise<IUser> {
    try {
      const admins: IUser[] = await User.getAllActiveAdmins();

      if (
        admins.length === 1 &&
        admins[0]._id === user._id &&
        value === 'inactive'
      ) {
        throw {
          type: 'ClientError',
          name: 'FailedUpdateActiveStatus',
          message: 'The system must have at least one active admin user',
        } as IAppError;
      }

      user.active = value;

      // send email to notify the user
      if (user.credentials.email && value === 'inactive') {
        await EmailUtils.sendEmail(
          user.credentials.email!,
          EmailType.ACCOUNT_INACTIVE
        );
      }

      return user;
    } catch (error) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateActiveStatus',
        message: (error as Error).message,
      } as IAppError;
    }
  }

  /**
   * Apply the role update to the user object
   */
  private static async applyRole(
    user: IUser,
    role: 'admin' | 'coordinator' | 'member'
  ): Promise<IUser> {
    try {
      const admins: IUser[] = await User.getAllActiveAdmins();

      if (
        admins.length === 1 &&
        admins[0]._id === user._id &&
        role !== 'admin'
      ) {
        throw {
          type: 'ClientError',
          name: 'FailedUpdateRole',
          message: 'The system must have at least one active admin user',
        } as IAppError;
      }

      user.role = role;
      return user;
    } catch (error) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateRole',
        message: (error as Error).message,
      } as IAppError;
    }
  }

  /**
   * Apply the email update to the user object
   */
  private static applyEmail(user: IUser, email: string): IUser {
    try {
      this.validateEmail(email);
      user.verified = false;
      user.credentials.email = email;
      return user;
    } catch (error) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateEmail',
        message: (error as Error).message,
      } as IAppError;
    }
  }

  /**
   * Apply the username update to the user object
   */
  private static async applyUsername(
    user: IUser,
    username: string
  ): Promise<IUser> {
    try {
      await this.validateUsername(username);
      const sanitizedUsername = sanitizeText(username).toLowerCase();
      user.credentials.username = sanitizedUsername;
      return user;
    } catch (error) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateUsername',
        message: (error as Error).message,
      } as IAppError;
    }
  }

  /**
   * Apply the password update to the user object
   */
  private static async applyPassword(
    user: IUser,
    password: string
  ): Promise<IUser> {
    try {
      this.validatePassword(password);
      user.credentials.password = await bcrypt.hash(password, 10);
      user.credentials.password = await bcrypt.hash(password, 10);
      return user;
    } catch (error) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdatePassword',
        message: (error as Error).message,
      } as IAppError;
    }
  }
}

export default UserUtils;
