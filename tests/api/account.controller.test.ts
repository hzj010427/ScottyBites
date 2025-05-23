import { Server } from 'http';
import App from '../../server/app';
import AuthController from '../../server/controllers/auth.controller';
import AccountController from '../../server/controllers/account.controller';
import axios, { AxiosError } from 'axios';
import DAC from '../../server/db/dac';
import { InMemoryDB } from '../../server/db/inMemory.db';
import { IAuth, IUpdatedUser, IUser } from '../../common/user.interface';
import { User } from '../../server/models/user.model';
import path from 'path';

const HOST = 'http://localhost';
const dummyStaticPath = path.join(__dirname, '..');

let app: App;
let server: Server;

describe('Integration Tests: Login Logout', () => {
  const PORT = 4000; // test port
  let userId: string = ''; // User ID for prepopulated user
  let token: string = ''; // Token for prepopulated user after login

  beforeAll(async () => {
    // Initialize App with in-memory DB
    app = new App(
      [new AuthController('/auth'), new AccountController('/account')],
      {
        port: PORT,
        host: HOST,
        clientDir: dummyStaticPath,
        db: new InMemoryDB(), // in-memory DB for testing
        url: `${HOST}:${PORT}`,
        initOnStart: true,
      }
    );

    // Start the server
    server = await app.listen();
  });

  beforeEach(async () => {
    // Reset the in-memory DB before each test
    DAC.db.init();

    // Prepopulate the in-memory DB with a valid user
    const credentials: IAuth = {
      username: 'chris',
      email: 'minghuay@andrew.cmu.edu',
      password: 'pwd123',
    };
    const user: User = new User(credentials);
    userId = user._id;
    await user.join();
    await User.acknowledgeUser('chris'); // agree to terms

    // Log in the user
    const authInfo: IAuth = {
      email: '',
      username: 'chris',
      password: 'pwd123',
    };
    const { data } = await axios.post(
      `${HOST}:${PORT}/auth/api/tokens`,
      authInfo
    );
    token = data.payload.token;
  });

  afterAll(() => {
    server.close();
  });

  describe('Integration Tests: Logout', () => {
    test('Should log out successfully and update online status to false', async () => {
      const fieldToChange: IUpdatedUser = {
        online: false,
      };

      const res = await axios.patch(
        `${HOST}:${PORT}/account/api/users/${userId}`,
        fieldToChange,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Send the token in the Authorization header
          },
        }
      );

      const { data } = res;
      const user: IUser = data.payload;

      expect(res.status).toBe(200);
      expect(data.name).toBe('UserUpdated');
      expect(data.message).toBe('User updated successfully');
      expect(user.online).toBe(false); // Ensure user is offline after logout

      // Ensure db is updated
      const userInDB = await DAC.db.findUserByUsername('chris');
      expect(userInDB).not.toBeNull();
      expect(userInDB?.online).toBe(false);
    });

    test('Should fail logout if token is missing', async () => {
      const fieldToChange: IUpdatedUser = {
        online: false,
      };

      try {
        await axios.patch(
          `${HOST}:${PORT}/account/api/users/${userId}`,
          fieldToChange
        );
        fail('Expected request to fail with status 401 but it succeeded');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axios.isAxiosError(axiosError)).toBe(true); // Check it's an Axios error
        expect(axiosError.response?.status).toBe(401);
        expect(axiosError.response?.data).toEqual({
          type: 'ClientError',
          name: 'NoToken',
          message: 'No token provided',
        });
      }
    });
  });
});

describe('Integration Tests: ManageAcct', () => {
  const PORT = 4005; // test port

  let memberToken1: string;
  let memberToken2: string;
  let adminToken: string;

  let memberId1: string;
  let memberId2: string;
  let adminId: string;

  beforeAll(async () => {
    // Initialize App with in-memory DB
    app = new App(
      [new AuthController('/auth'), new AccountController('/account')],
      {
        port: PORT,
        host: HOST,
        clientDir: dummyStaticPath,
        db: new InMemoryDB(), // in-memory DB for testing
        url: `${HOST}:${PORT}`,
        initOnStart: true,
      }
    );

    // Start the server
    server = await app.listen();
  });

  beforeEach(async () => {
    // Reset the in-memory DB before each test
    DAC.db.init();

    // Prepopulate the in-memory DB with a valid member
    const credentials1: IAuth = {
      username: 'zijieh',
      email: 'test@andrew.cmu.edu',
      password: 'pwd123',
    };
    const user1: User = new User(credentials1);
    await user1.join();
    await User.acknowledgeUser('zijieh'); // agree to terms

    const credentials2: IAuth = {
      username: 'zijieh2',
      email: 'test2@andrew.cmu.edu',
      password: 'pwd123',
    };
    const user2: User = new User(credentials2);
    await user2.join();
    await User.acknowledgeUser('zijieh2'); // agree to terms

    // Log in the member
    const authInfo1: IAuth = {
      email: '',
      username: 'zijieh',
      password: 'pwd123',
    };
    const { data } = await axios.post(
      `${HOST}:${PORT}/auth/api/tokens`,
      authInfo1
    );
    memberToken1 = data.payload.token;
    memberId1 = data.payload.user._id;

    const authInfo2: IAuth = {
      email: '',
      username: 'zijieh2',
      password: 'pwd123',
    };
    const { data: data2 } = await axios.post(
      `${HOST}:${PORT}/auth/api/tokens`,
      authInfo2
    );
    memberToken2 = data2.payload.token;
    memberId2 = data2.payload.user._id;

    // Log in the admin
    const authInfoAdmin: IAuth = {
      email: '',
      username: 'admin',
      password: 'admin',
    };
    const { data: dataAdmin } = await axios.post(
      `${HOST}:${PORT}/auth/api/tokens`,
      authInfoAdmin
    );
    adminToken = dataAdmin.payload.token;
    adminId = dataAdmin.payload.user._id;
  });

  afterAll(() => {
    server.close();
  });

  test('Admin can deactivates another user', async () => {
    const fieldToChange: IUpdatedUser = {
      active: 'inactive',
    };

    const res = await axios.patch(
      `${HOST}:${PORT}/account/api/users/${memberId1}`,
      fieldToChange,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    const { data } = res;
    const user: IUser = data.payload;

    expect(res.status).toBe(200);
    expect(data.name).toBe('UserUpdated');
    expect(data.message).toBe('User updated successfully');
    expect(user.active).toBe('inactive');

    // Ensure db is updated
    const userInDB = await DAC.db.findUserByUsername('zijieh');
    expect(userInDB).not.toBeNull();
    expect(userInDB?.active).toBe('inactive');
  });

  test('Member can deactivates their own account', async () => {
    const fieldToChange: IUpdatedUser = {
      active: 'inactive',
    };

    const res = await axios.patch(
      `${HOST}:${PORT}/account/api/users/${memberId1}`,
      fieldToChange,
      {
        headers: {
          Authorization: `Bearer ${memberToken1}`,
        },
      }
    );

    const { data } = res;
    const user: IUser = data.payload;

    expect(res.status).toBe(200);
    expect(data.name).toBe('UserUpdated');
    expect(data.message).toBe('User updated successfully');
    expect(user.active).toBe('inactive');

    // Ensure db is updated
    const userInDB = await DAC.db.findUserByUsername('zijieh');
    expect(userInDB).not.toBeNull();
    expect(userInDB?.active).toBe('inactive');
  });

  test('Admin can change another user’s privilege level', async () => {
    const fieldToChange: IUpdatedUser = {
      role: 'admin',
    };

    const res = await axios.patch(
      `${HOST}:${PORT}/account/api/users/${memberId1}`,
      fieldToChange,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    const { data } = res;
    const user: IUser = data.payload;

    expect(res.status).toBe(200);
    expect(data.name).toBe('UserUpdated');
    expect(data.message).toBe('User updated successfully');
    expect(user.role).toBe('admin');

    // Ensure db is updated
    const userInDB = await DAC.db.findUserByUsername('zijieh');
    expect(userInDB).not.toBeNull();
    expect(userInDB?.role).toBe('admin');
  });

  test('Member cannot to change another user’s account status', async () => {
    const fieldToChange: IUpdatedUser = {
      active: 'inactive',
    };

    try {
      await axios.patch(
        `${HOST}:${PORT}/account/api/users/${memberId2}`,
        fieldToChange,
        {
          headers: {
            Authorization: `Bearer ${memberToken1}`,
          },
        }
      );
      throw new Error(
        "Expected member to fail to update another member's account status, but it succeeded"
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;
        expect(axiosError.response?.status).toBe(403);
        expect(axiosError.response?.data).toEqual({
          type: 'ClientError',
          name: 'ForbiddenRequest',
          message:
            '[{"field":"active","message":"Permission denied: You cannot update active."}]',
        });
      } else {
        throw err;
      }
    }
  });

  test('Member cannot change his own privilege level', async () => {
    const fieldToChange: IUpdatedUser = {
      role: 'admin',
    };

    try {
      await axios.patch(
        `${HOST}:${PORT}/account/api/users/${memberId1}`,
        fieldToChange,
        {
          headers: {
            Authorization: `Bearer ${memberToken1}`,
          },
        }
      );
      throw new Error(
        'Expected member to fail to update his own privilege level, but it succeeded'
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError;
        expect(axiosError.response?.status).toBe(403);
        expect(axiosError.response?.data).toEqual({
          type: 'ClientError',
          name: 'ForbiddenRequest',
          message:
            '[{"field":"role","message":"Permission denied: You cannot update role."}]',
        });
      } else {
        throw err;
      }
    }
  });

  test('Admin cannot deactivate their own account (last admin)', async () => {
    const fieldToChange: IUpdatedUser = {
      active: 'inactive',
    };

    try {
      await axios.patch(
        `${HOST}:${PORT}/account/api/users/${adminId}`,
        fieldToChange,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );
      throw new Error(
        'Expected admin to fail to deactivate their own account, but it succeeded'
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        expect(err.response.status).toBe(400);
        expect(err.response.data).toEqual({
          type: 'ClientError',
          name: 'FailedUpdateUser',
          message:
            '[{"field":"active","message":"The system must have at least one active admin user"}]',
        });
      } else {
        throw err;
      }
    }
  });
});

describe('Integration Tests: Account Information Retrieval', () => {
  const PORT = 4008; // test port

  beforeAll(async () => {
    // Initialize App with in-memory DB
    app = new App(
      [new AuthController('/auth'), new AccountController('/account')],
      {
        port: PORT,
        host: HOST,
        clientDir: dummyStaticPath,
        db: new InMemoryDB(), // in-memory DB for testing
        url: `${HOST}:${PORT}`,
        initOnStart: true,
      }
    );

    // Start the server
    server = await app.listen();
  });

  beforeEach(async () => {
    // Reset the in-memory DB before each test
    DAC.db.init();
  });
  afterAll(() => {
    server.close();
  });

  test('Member Should get self account info', async () => {
    // Prepopulate the in-memory DB with a valid user
    const credentials: IAuth = {
      username: 'chris',
      email: 'minghuay@andrew.cmu.edu',
      password: 'pwd123',
    };
    const chris: User = new User(credentials);
    const chrisId = chris._id;
    await chris.join();
    await User.acknowledgeUser('chris'); // agree to terms

    // Log in the user
    const authInfo: IAuth = {
      email: '',
      username: 'chris',
      password: 'pwd123',
    };
    const { data } = await axios.post(
      `${HOST}:${PORT}/auth/api/tokens`,
      authInfo
    );
    const token = data.payload.token;

    const res = await axios.get(
      `${HOST}:${PORT}/account/api/users/${chrisId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Send the token in the Authorization header
        },
      }
    );

    const user: IUser = res.data.payload;

    expect(res.status).toBe(200);
    expect(user.credentials.username).toBe('chris');
    expect(user.credentials.email).toBe('minghuay@andrew.cmu.edu');
  });

  test('Member should get other account info', async () => {
    // Prepopulate the in-memory DB with a valid user
    const credentials: IAuth = {
      username: 'chris',
      email: 'minghuay@andrew.cmu.edu',
      password: 'pwd123',
    };
    const chris: User = new User(credentials);
    await chris.join();
    await User.acknowledgeUser('chris'); // agree to terms

    const terryCredentials: IAuth = {
      username: 'terry',
      email: 'tingruiz@andrew.cmu.edu',
      password: 'pwd123',
    };
    const terry: User = new User(terryCredentials);
    const terryId = terry._id;
    await terry.join();
    await User.acknowledgeUser('terry'); // agree to terms

    // Log in the chris
    const authInfo: IAuth = {
      email: '',
      username: 'chris',
      password: 'pwd123',
    };

    const { data } = await axios.post(
      `${HOST}:${PORT}/auth/api/tokens`,
      authInfo
    );
    const token = data.payload.token;

    //form and send a request to get terry's info
    const res = await axios.get(
      `${HOST}:${PORT}/account/api/users/${terryId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Send the token in the Authorization header
        },
      }
    );

    const user: IUser = res.data.payload;

    // check the response
    expect(res.status).toBe(200);
    expect(user.credentials.username).toBe('terry');
    expect(user.credentials.email).toBe('tingruiz@andrew.cmu.edu');
  });

  test('Should fail getUserInfo if user not exist', async () => {
    // no need to prepopulate the in-memory DB
    // Log in the admin
    const authInfo: IAuth = {
      email: '',
      username: 'admin',
      password: 'admin',
    };
    const { data } = await axios.post(
      `${HOST}:${PORT}/auth/api/tokens`,
      authInfo
    );
    const token = data.payload.token;

    const nonExistentId = 'non-existent-id';
    try {
      const res = await axios.get(
        `${HOST}:${PORT}/account/api/users/${nonExistentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Send the token in the Authorization header
          },
        }
      );
      fail('Expected request to fail with status 404 but it succeeded');
    } catch (error) {
      const axiosError = error as AxiosError;
      expect(axios.isAxiosError(axiosError)).toBe(true); // Check it's an Axios error
      expect(axiosError.response?.status).toBe(404);
      expect(axiosError.response?.data).toEqual({
        type: 'ClientError',
        name: 'UserNotFound',
        message: 'User not found',
      });
    }
  });
});

describe('Integration Tests: Search User', () => {
  const PORT = 4009; // test port
  let headers = {
    Authorization: '',
  };

  beforeAll(async () => {
    // Initialize App with in-memory DB
    app = new App(
      [new AuthController('/auth'), new AccountController('/account')],
      {
        port: PORT,
        host: HOST,
        clientDir: dummyStaticPath,
        db: new InMemoryDB(), // in-memory DB for testing
        url: `${HOST}:${PORT}`,
        initOnStart: true,
      }
    );
    // Start the server
    server = await app.listen();
  });

  beforeEach(async () => {
    // Reset the in-memory DB before each test
    DAC.db.cleanUp();
    DAC.db.init();

    // Add a user to the in-memory DB
    const credentials: IAuth = {
      username: 'newuser',
      email: 'newuser@andrew.cmu.edu',
      password: 'pwd123',
    };
    const newuser: User = new User(credentials);
    await newuser.join();
    await User.acknowledgeUser('newuser'); // agree to terms

    // Log in the user
    const authInfo: IAuth = {
      email: '',
      username: 'newuser',
      password: 'pwd123',
    };
    const { data } = await axios.post(
      `${HOST}:${PORT}/auth/api/tokens`,
      authInfo
    );
    headers = {
      Authorization: `Bearer ${data.payload.token}`,
    };
  });

  afterAll(() => {
    server.close();
  });

  test('Should search for a user by username', async () => {
    const res = await axios.get(`${HOST}:${PORT}/account/api/users`, {
      params: { q: 'newuser' },
      headers,
    });
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('SearchCompleted');

    const users: IUser[] = res.data.payload;
    expect(users).toHaveLength(1);
    expect(users[0].credentials.username).toBe('newuser');
  });

  test('Should search for a user by email', async () => {
    const res = await axios.get(`${HOST}:${PORT}/account/api/users`, {
      params: { q: 'newuser@andrew.cmu.edu' },
      headers,
    });
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('SearchCompleted');

    const users: IUser[] = res.data.payload;
    expect(users).toHaveLength(1);
    expect(users[0].credentials.email).toBe('newuser@andrew.cmu.edu');
  });

  test('Should search for a user by partial username', async () => {
    const res = await axios.get(`${HOST}:${PORT}/account/api/users`, {
      params: { q: 'new' },
      headers,
    });
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('SearchCompleted');

    const users: IUser[] = res.data.payload;
    expect(users).toHaveLength(1);
    expect(users[0].credentials.username).toBe('newuser');
  });
});
