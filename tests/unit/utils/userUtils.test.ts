import { UserUtils } from '../../../server/utils/userUtils';
import { User } from '../../../server/models/user.model';
import { IUser, IUpdatedUser } from '../../../common/user.interface';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import { IAppError } from '../../../common/server.responses';
import { IAuth, IJwtPayload } from '../../../common/user.interface';
import jwt from 'jsonwebtoken';
import { JWT_KEY as secretKey } from '../../../server/env';
import bcrypt from 'bcrypt';
import DAC from '../../../server/db/dac';

describe('Administrator Action of the User Profile Rule', () => {
  let adminUser: IUser;
  let testUser: IUser;

  beforeEach(async () => {
    DAC.db = new InMemoryDB();
    await DAC.db.init();

    adminUser = (await DAC.db.findUserByUserId('admin')) as IUser;
    testUser = (await DAC.db.findUserByUserId('test')) as IUser;
  });

  afterEach(async () => {
    await DAC.db.cleanUp();
  });

  test("Admin allowed to switch member's active status", async () => {
    const fieldToChange: IUpdatedUser = { active: 'inactive' };

    expect(() => {
      UserUtils.validateUpdatePermission(adminUser, testUser, fieldToChange);
    }).not.toThrow();

    // Verify side effect: try to actually update and check the result
    const updatedUser = await User.updateUser(testUser._id, fieldToChange);
    expect(updatedUser.active).toBe('inactive');
  });

  test("Admin allowed to switch member's privilege", async () => {
    const fieldToChange: IUpdatedUser = { role: 'admin' };

    expect(() => {
      UserUtils.validateUpdatePermission(adminUser, testUser, fieldToChange);
    }).not.toThrow();

    // Verify side effect: try to actually update and check the result
    const updatedUser = await User.updateUser(testUser._id, fieldToChange);
    expect(updatedUser.role).toBe('admin');
  });

  test("Admin allowed to change member's password", async () => {
    const fieldToChange: IUpdatedUser = { password: 'newPassword' };

    expect(() => {
      UserUtils.validateUpdatePermission(adminUser, testUser, fieldToChange);
    }).not.toThrow();

    // Verify side effect: try to actually update and check the result
    const updatedUser = await User.updateUser(testUser._id, fieldToChange);
    expect(
      await bcrypt.compare('newPassword', updatedUser.credentials.password)
    ).toBe(true);
  });

  test('Admin not allowed to change his username', async () => {
    const fieldToChange: IUpdatedUser = { username: 'newUsername' };

    try {
      UserUtils.validateUpdatePermission(adminUser, adminUser, fieldToChange);
      throw new Error(
        'Expected update admin username to fail, but it succeeded'
      );
    } catch (err) {
      const error = err as IAppError;
      expect(error.message).toBe(
        '[{"field":"username","message":"Permission denied: You cannot update username."}]'
      );
      expect(error.type).toBe('ClientError');
      expect(error.name).toBe('ForbiddenRequest');
    }

    // Verify side effect: admin user should not have been changed
    const unchangedAdmin = (await DAC.db.findUserByUserId('admin')) as IUser;
    expect(unchangedAdmin.credentials.username).toBe('admin');
  });

  test('Admin not allowed to change his email', async () => {
    const fieldToChange: IUpdatedUser = { email: 'newEmail' };

    try {
      UserUtils.validateUpdatePermission(adminUser, adminUser, fieldToChange);
      throw new Error('Expected update admin email to fail, but it succeeded');
    } catch (err) {
      const error = err as IAppError;
      expect(error.message).toBe(
        '[{"field":"email","message":"Permission denied: You cannot update email."}]'
      );
      expect(error.type).toBe('ClientError');
      expect(error.name).toBe('ForbiddenRequest');
    }

    // Verify side effect: admin user should not have been changed
    const unchangedAdmin = (await DAC.db.findUserByUserId('admin')) as IUser;
    expect(unchangedAdmin.credentials.email).toBe(undefined);
  });
});

describe('Privilege Rule:', () => {
  let adminUser: IUser;
  let testUser: IUser;

  beforeEach(async () => {
    await DAC.db.init();

    adminUser = (await DAC.db.findUserByUserId('admin')) as IUser;
    testUser = (await DAC.db.findUserByUserId('test')) as IUser;
  });

  afterEach(async () => {
    await DAC.db.cleanUp();
  });

  test('Member allowed to manage his own account', async () => {
    const fieldToChange: IUpdatedUser = { active: 'inactive' };

    expect(() => {
      UserUtils.validateUpdatePermission(testUser, testUser, fieldToChange);
    }).not.toThrow();

    // Verify side effect: try to actually update and check the result
    const updatedUser = await User.updateUser(testUser._id, fieldToChange);
    expect(updatedUser.active).toBe('inactive');
  });

  test("Member not allowed to manage admin's account", async () => {
    const fieldToChange: IUpdatedUser = { active: 'inactive' };

    try {
      UserUtils.validateUpdatePermission(testUser, adminUser, fieldToChange);
      throw new Error(
        'Expected update member is not allowed to manage admin to fail, but it succeeded'
      );
    } catch (err) {
      const error = err as IAppError;
      expect(error.message).toBe(
        '[{"field":"active","message":"Permission denied: You cannot update active."}]'
      );
      expect(error.type).toBe('ClientError');
      expect(error.name).toBe('ForbiddenRequest');
    }

    // Verify side effect: admin user should not have been changed
    const unchangedAdmin = (await DAC.db.findUserByUserId('admin')) as IUser;
    expect(unchangedAdmin.active).toBe('active');
  });

  test('Admin allowed to manage his own account', async () => {
    const fieldToChange: IUpdatedUser = { role: 'admin' };

    expect(() => {
      UserUtils.validateUpdatePermission(adminUser, adminUser, fieldToChange);
    }).not.toThrow();

    // Verify side effect: try to actually update and check the result
    const updatedAdmin = await User.updateUser(adminUser._id, fieldToChange);
    expect(updatedAdmin.role).toBe('admin');
  });

  test("Admin allowed to manage member's account", async () => {
    const fieldToChange: IUpdatedUser = { password: 'newPassword' };

    expect(() => {
      UserUtils.validateUpdatePermission(adminUser, testUser, fieldToChange);
    }).not.toThrow();

    // Verify side effect: try to actually update and check the result
    const updatedUser = await User.updateUser(testUser._id, fieldToChange);
    expect(
      await bcrypt.compare('newPassword', updatedUser.credentials.password)
    ).toBe(true);
  });
});

describe('UserUtils tests', () => {
  beforeEach(() => {});

  test('should not be validated login credential without username', () => {
    const credential = {
      username: '',
      password: 'password',
    } as IAuth;
    try {
      const isValid = UserUtils.validateCredentials(credential);
      throw new Error('erroneously valid username');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).toBe('Missing required information: username');
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        expect((err as IAppError).message).toBe(
          'Missing required information: username'
        );
      } else {
        throw err;
      }
    }
  });

  test('Should success validate a unexpired and correct token', () => {
    const tokenPayload = {
      userId: 'terry',
      password: 'terry',
    } as IJwtPayload;
    const expiration = 'never';
    const signedToken = UserUtils.generateToken(tokenPayload, expiration);
    const decoded = jwt.verify(signedToken, secretKey) as IJwtPayload;
    expect(decoded.userId).toBe(tokenPayload.userId);
    expect(decoded.password).toBe(tokenPayload.password);
  });

  test('Should not validate an incorrect token', () => {
    const invalidToken = 'this.is.an.invalid.token';
    try {
      jwt.verify(invalidToken, secretKey);
      throw new Error('Should not validate an incorrect token');
    } catch (err: unknown) {
      if (err instanceof jwt.JsonWebTokenError) {
        expect(err.message).toBe('jwt malformed');
      } else {
        throw err;
      }
    }
  });

  test('Should not validate an expired token', async () => {
    const tokenPayload = {
      userId: 'terry',
      password: 'terry',
    } as IJwtPayload;

    // Generate a token with a short expiration time (e.g., 1 second)
    const signedToken = jwt.sign(tokenPayload, secretKey, { expiresIn: '1s' });

    // Wait for the token to expire
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    try {
      jwt.verify(signedToken, secretKey);
      throw new Error('Should not validate an expired token');
    } catch (err: unknown) {
      if (err instanceof jwt.TokenExpiredError) {
        expect(err.message).toBe('jwt expired');
      } else {
        throw err;
      }
    }
  });
});

describe('User Registration Validation (userUtils)', () => {
  beforeEach(async () => {
    DAC.db = new InMemoryDB();
    const credentials: IAuth = {
      username: 'chris',
      email: 'minghuay@andrew.cmu.edu',
      password: 'pwd123',
    };
    const user: User = new User(credentials);
    await user.join();
  });

  describe('Username Validation', () => {
    test('should throw an error if username is less than 4 characters', async () => {
      await expect(UserUtils.validateUsername('abc')).rejects.toEqual({
        type: 'ClientError',
        name: 'InvalidUsername',
        message: 'The username must be at least 4 characters long',
      });
    });

    test('should allow a username >= 4 characters long', async () => {
      await expect(UserUtils.validateUsername('John')).resolves.toBeUndefined();
      await expect(
        UserUtils.validateUsername('Terry')
      ).resolves.toBeUndefined();
    });

    test('should throw an error if username is in the banned list (case insensitive)', async () => {
      await expect(UserUtils.validateUsername('java')).rejects.toEqual({
        type: 'ClientError',
        name: 'InvalidUsername',
        message: 'The username is reserved',
      });
    });

    test('should allow a valid username not in the banned list or taken', async () => {
      await expect(
        UserUtils.validateUsername('validUser123')
      ).resolves.toBeUndefined();
    });

    test('should throw an error if username is already taken', async () => {
      await expect(UserUtils.validateUsername('chris')).rejects.toEqual({
        type: 'ClientError',
        name: 'InvalidUsername',
        message: 'The username is already taken',
      });
    });

    test('should throw an error if username is already taken (case insensitive)', async () => {
      await expect(
        UserUtils.validateUsername('UniqueCase')
      ).resolves.toBeUndefined();
      // Store into db
      const credentials: IAuth = {
        username: 'UniqueCase',
        email: 'UniqueCase@andrew.cmu.edu',
        password: 'pwd123',
      };
      const user: User = new User(credentials);
      await user.join();

      await expect(UserUtils.validateUsername('uniquecase')).rejects.toEqual({
        type: 'ClientError',
        name: 'InvalidUsername',
        message: 'The username is already taken',
      });
    });
  });

  describe('Password Validation', () => {
    test('should throw an error if password is less than 4 characters', () => {
      expect(() => UserUtils.validatePassword('123')).toThrow({
        type: 'ClientError',
        name: 'InvalidPassword',
        message: 'The password must be at least 4 characters long',
      } as IAppError);
    });

    test('should allow a password >= 4 characters long', () => {
      expect(() => UserUtils.validatePassword('Pass')).not.toThrow();
      expect(() => UserUtils.validatePassword('Passs')).not.toThrow();
    });

    test('should allow passwords with different cases', () => {
      expect(() => UserUtils.validatePassword('password')).not.toThrow();
      expect(() => UserUtils.validatePassword('PASSWORD')).not.toThrow();
      expect(() => UserUtils.validatePassword('PaSsWoRd')).not.toThrow();
    });
  });
});
