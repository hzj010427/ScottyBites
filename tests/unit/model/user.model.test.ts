import DAC from '../../../server/db/dac';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import { User } from '../../../server/models/user.model';
import { IAuth } from '../../../common/user.interface';
import { IAppError } from '../../../common/server.responses';
import Controller from '../../../server/controllers/controller';
import { Server as SocketServer } from 'socket.io';
import { IUser, IUpdatedUser } from '../../../common/user.interface';
import { UserUtils } from '../../../server/utils/userUtils';
import bcrypt from 'bcrypt';

describe('User model tests', () => {
  beforeAll(() => {});

  beforeEach(async () => {
    DAC.db = new InMemoryDB();
    // await DAC.db.init();

    //Mock the server socket
    Controller.io = {
      emit: jest.fn(), // Mock the emit function
    } as unknown as SocketServer;
  });

  test('Login: Should login a user with correct username and password', async () => {
    const credential = {
      email: 'tingruiz@andrew.cmu.edu',
      username: 'terry',
      password: 'terry',
    } as IAuth;
    const terry = new User(credential);
    terry.agreedToTerms = true;
    await terry.join();

    const loginCredential = {
      username: 'terry',
      password: 'terry',
    } as IAuth;

    await User.login(loginCredential);

    const user = await DAC.db.findUserByUsername('terry');
    expect(user).not.toBeNull();
    expect(user!.online).toBe(true);
  });

  test('Login: Should not login a user with incorrect password', async () => {
    const credential = {
      email: 'tingruiz@andrew.cmu.edu',
      username: 'terry',
      password: 'terry',
    } as IAuth;
    const terry = new User(credential);
    terry.agreedToTerms = true;

    const loginCredential = {
      username: 'terry',
      password: 'Wrong Password',
    } as IAuth;

    await terry.join();

    try {
      await User.login(loginCredential);
      throw new Error('Should not login a user with incorrect password');
    } catch (err: unknown) {
      expect((err as IAppError).message || err).toBe('Incorrect password');
    }
  });

  test('Login: Should not login a user that does not exist', async () => {
    const loginCredential = {
      username: 'terry',
      password: 'terry',
    } as IAuth;

    try {
      await User.login(loginCredential);
      throw new Error('Should not login a user that does not exist');
    } catch (err: unknown) {
      expect((err as IAppError).message || err).toBe('User not found');
    }
  });

  test('Login: Should not login a user that is inactive', async () => {
    const credential = {
      email: 'tingruiz@andrew.cmu.edu',
      username: 'terry',
      password: 'terry',
    } as IAuth;
    const terry = new User(credential);
    terry.agreedToTerms = true;
    terry.active = 'inactive';

    const loginCredential = {
      username: 'terry',
      password: 'terry',
    } as IAuth;

    await terry.join();

    try {
      await User.login(loginCredential);
      throw new Error('Should not login a inactive user');
    } catch (err: unknown) {
      expect((err as IAppError).message || err).toBe(
        'User is inactive, cannot login'
      );
    }
  });

  test('Login: Should not login a user that has not agreed to terms', async () => {
    const credential = {
      email: 'tingruiz@andrew.cmu.edu',
      username: 'terry',
      password: 'terry',
    } as IAuth;
    const terry = new User(credential);
    terry.agreedToTerms = false;

    const loginCredential = {
      username: 'terry',
      password: 'terry',
    } as IAuth;

    await terry.join();

    try {
      await User.login(loginCredential);
      throw new Error('Should not login a user that not agreed to terms');
    } catch (err: unknown) {
      expect((err as IAppError).message || err).toBe(
        'Please agree to the terms and conditions'
      );
    }
  });

  test('Logout: Should logout a user correctly', async () => {
    const credential = {
      email: 'tingruiz@andrew.cmu.edu',
      username: 'terry',
      password: 'terry',
    } as IAuth;
    const terry = new User(credential);
    terry.agreedToTerms = true;

    await terry.join();

    const loginCredential = {
      username: 'terry',
      password: 'terry',
    } as IAuth;

    await User.login(loginCredential);
    const loginUser = await DAC.db.findUserByUsername('terry');
    if (loginUser === null) {
      throw new Error('User not found');
    }
    await User.updateUser(loginUser!._id, { online: false });
    const logoutUser = await DAC.db.findUserByUsername('terry');
    expect(logoutUser).not.toBeNull();
    expect(logoutUser!.online).toBe(false);
    expect(Controller.io.emit).toHaveBeenCalledWith(
      'allUsers',
      expect.any(Array)
    );
  });

  afterEach(async () => {
    await DAC.db.cleanUp();
  });
});

describe('At Least One Administrator Rule', () => {
  let adminUser: IUser;
  DAC.db = new InMemoryDB();

  beforeEach(async () => {
    await DAC.db.init();

    adminUser = (await DAC.db.findUserByUserId('admin')) as IUser;
  });

  afterEach(async () => {
    await DAC.db.cleanUp();
  });

  it('should not allow the last admin to change their role to non-admin', async () => {
    const updates: IUpdatedUser = {
      role: 'member',
    };

    try {
      await User.updateUser(adminUser._id, updates);
      throw new Error('Expected update last admin to fail, but it succeeded');
    } catch (err) {
      const error = err as IAppError;
      expect(error.message).toBe(
        '[{"field":"role","message":"The system must have at least one active admin user"}]'
      );
    }

    // Verify user wasn't changed
    const user = (await DAC.db.findUserByUserId('admin')) as IUser;
    expect(user.active).toBe('active');
    expect(user.role).toBe('admin');
  });

  it('should not allow the last admin to change their active status to inactive', async () => {
    const updates: IUpdatedUser = {
      active: 'inactive',
    };

    try {
      await User.updateUser(adminUser._id, updates);
      throw new Error('Expected update last admin to fail, but it succeeded');
    } catch (err) {
      const error = err as IAppError;
      expect(error.message).toBe(
        '[{"field":"active","message":"The system must have at least one active admin user"}]'
      );
    }

    // Verify user wasn't changed
    const user = (await DAC.db.findUserByUserId('admin')) as IUser;
    expect(user.active).toBe('active');
    expect(user.role).toBe('admin');
  });
});

describe('User Registration Validation (userModel)', () => {
  beforeEach(() => {
    DAC.db = new InMemoryDB();
  });

  describe('Save user into database', () => {
    test('should be able to find the user in db after saving', async () => {
      // Save a new user
      const credentials: IAuth = {
        username: 'chris',
        email: 'minghuay@andrew.cmu.edu',
        password: 'pwd123',
      };
      const user: User = new User(credentials);
      await user.join();

      // Find the user in DB
      const foundUser = await DAC.db.findUserByUsername('chris');
      expect(foundUser).not.toBeNull();
      expect(foundUser?.credentials.username).toBe('chris');
      expect(foundUser?.credentials.email).toBe('minghuay@andrew.cmu.edu');

      // Verify the password
      const isPasswordCorrect = await bcrypt.compare(
        'pwd123',
        foundUser!.credentials.password // Stored hashed password
      );

      expect(isPasswordCorrect).toBe(true);
    });
  });

  describe('Username Validation', () => {
    test('should throw an error if username is already taken (case insensitive)', async () => {
      // Save user1
      const credentials1: IAuth = {
        username: 'chris',
        email: 'minghuay@andrew.cmu.edu',
        password: 'pwd123',
      };
      const user1: User = new User(credentials1);
      await user1.join();

      // Save user2 with the same username but different case
      const credentials2: IAuth = {
        username: 'CHRIS',
        email: 'minghuay@andrew.cmu.edu',
        password: 'pwd123',
      };
      const user2: User = new User(credentials2);
      await expect(user2.join()).rejects.toEqual({
        type: 'ClientError',
        name: 'UserExists',
        message: 'User already exists',
      });
    });
  });

  describe('Password Validation', () => {
    test('should differentiate passwords with different cases', async () => {
      // Save two users with same password but different cases
      const credentials1: IAuth = {
        username: 'chris',
        email: 'minghuay@andrew.cmu.edu',
        password: 'password',
      };
      const user1: User = new User(credentials1);
      await user1.join();

      const credentials2: IAuth = {
        username: 'terry',
        email: 'terry@andrew.cmu.edu',
        password: 'PASSWORD',
      };
      const user2: User = new User(credentials2);
      await user2.join();

      // Find user1 in DB
      const foundUser1 = await DAC.db.findUserByUsername('chris');
      expect(foundUser1).not.toBeNull();
      // Verify the password
      expect(
        await bcrypt.compare(
          'password',
          foundUser1!.credentials.password // Stored hashed password
        )
      ).toBe(true);

      // Find user2 in DB
      const foundUser2 = await DAC.db.findUserByUsername('terry');
      expect(foundUser2).not.toBeNull();
      // Verify the password
      expect(
        await bcrypt.compare(
          'PASSWORD',
          foundUser2!.credentials.password // Stored hashed password
        )
      ).toBe(true);
    });
  });
});

DAC._db = new InMemoryDB();

describe('Initial Administrator Rule', () => {
  beforeAll(async () => {
    await DAC._db.init();
  });

  test('Should be able to login as the initial administrator', async () => {
    const adminCred: IAuth = {
      username: 'admin',
      password: 'admin',
    };

    const admin: IUser | null = await User.login(adminCred);

    expect(admin).not.toBeNull();
  });
});

describe('Active/Inactive Rule', () => {
  let user: User;
  const credentials: IAuth = {
    email: 'newuser@test.cmu.edu',
    username: 'newuser',
    password: 'newuser',
  };

  beforeAll(async () => {
    await DAC._db.init();
    user = new User(credentials);
    await user.join();
  });

  test('Default user status should be active', async () => {
    expect(user.active).toBe('active');
  });

  test('Inactive user cannot log into the app any longer', async () => {
    await User.updateUser(user._id, { active: 'inactive' });

    await expect(User.login(credentials)).rejects.toEqual(
      expect.objectContaining({
        type: 'ClientError',
        name: 'UserInactive',
        message: expect.any(String),
      })
    );
  });
});

describe('Search User Unit Tests', () => {
  let user: User;
  let user2: User;
  const credentials: IAuth = {
    email: 'newuser@test.cmu.edu',
    username: 'a somename',
    password: 'newuser',
  };

  const credentials2: IAuth = {
    email: 'anotheruser@test.cmu.edu',
    username: 'another name',
    password: 'anotheruser',
  };

  beforeAll(async () => {
    await DAC._db.init();
    user = new User(credentials);
    user2 = new User(credentials2);
    await user.join();
    await user2.join();
  });

  test('Should search for a user by username', async () => {
    const result = await User.search('somename');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(user);
  });

  test('Should search for a user by email', async () => {
    const result = await User.search('newuser@test.cmu.edu');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(user);
  });

  test('Should search for partial match', async () => {
    const result = await User.search('newuser');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(user);
  });

  test('Should search multiple users by username', async () => {
    const result = await User.search('name');
    expect(result).toHaveLength(2);
    expect(result).toEqual([user, user2]);
  });

  test('Should search multiple users by email', async () => {
    const result = await User.search('test.cmu.edu');
    expect(result).toHaveLength(2);
    expect(result).toEqual([user, user2]);
  });

  test('Should not search stop words', async () => {
    const result = await User.search('a');
    expect(result).toHaveLength(0);
  });
});
