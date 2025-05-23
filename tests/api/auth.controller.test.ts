import { Server } from 'http';
import App from '../../server/app';
import AuthController from '../../server/controllers/auth.controller';
import axios, { AxiosError } from 'axios';
import DAC from '../../server/db/dac';
import { InMemoryDB } from '../../server/db/inMemory.db';
import { IAuth, IUser, IVerification } from '../../common/user.interface';
import { User } from '../../server/models/user.model';
import path from 'path';
import { EmailUtils } from '../../server/utils/emailUtils';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const HOST = 'http://localhost';
const dummyStaticPath = path.join(__dirname, '..');

let app: App;
let server: Server;

describe('Integration Tests: Login Logout', () => {
  const PORT = 4010; // test port
  const secretKey = process.env.JWT_KEY ?? 'someDefaultKey';

  beforeAll(async () => {
    // Initialize App with in-memory DB
    app = new App([new AuthController('/auth')], {
      port: PORT,
      host: HOST,
      clientDir: dummyStaticPath,
      db: new InMemoryDB(), // in-memory DB for testing
      url: `${HOST}:${PORT}`,
      initOnStart: true,
    });

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
    await user.join();
    await User.acknowledgeUser('chris'); // agree to terms
  });

  afterAll(() => {
    server.close();
  });

  describe('Integration Tests: Login', () => {
    test('Should login successfully and return a token', async () => {
      const authInfo: IAuth = {
        email: '',
        username: 'chris',
        password: 'pwd123',
      };

      const res = await axios.post(`${HOST}:${PORT}/auth/api/tokens`, authInfo);
      const { data } = res;
      const user: IUser = data.payload.user;
      const token = data.payload.token;

      expect(res.status).toBe(200);
      expect(data.name).toBe('UserAuthenticated');
      expect(data.message).toBe(`User chris authenticated successfully`);

      const expectedUser = {
        credentials: {
          username: 'chris',
          email: 'minghuay@andrew.cmu.edu',
        },
        online: true,
        agreedToTerms: true,
        verified: true,
        active: 'active',
        role: 'member',
      };

      expect(user).toMatchObject(expectedUser);

      // Verify the password
      const isPasswordCorrect = await bcrypt.compare(
        'pwd123',
        user.credentials.password
      );
      expect(isPasswordCorrect).toBe(true);

      // Ensure db is updated
      const userInDB = await DAC.db.findUserByUsername('chris');
      expect(userInDB).not.toBeNull();
      expect(userInDB).toMatchObject(expectedUser);

      // Verify JWT token
      const decodedToken = jwt.verify(token, secretKey) as {
        userId: string;
        password: string;
      };
      // Ensure the token contains the user's id and password matching the one in the DB
      expect(decodedToken.userId).toBe(userInDB?._id);
      expect(decodedToken.password).toBe(userInDB?.credentials.password);
    });

    test('Should fail login with incorrect password', async () => {
      const authInfo: IAuth = {
        email: '',
        username: 'chris',
        password: 'incorrectPassword',
      };

      try {
        await axios.post(`${HOST}:${PORT}/auth/api/tokens`, authInfo);
        fail('Expected request to fail with status 400 but it succeeded');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axios.isAxiosError(axiosError)).toBe(true); // Check it's an Axios error
        expect(axiosError.response?.status).toBe(400);
        expect(axiosError.response?.data).toEqual({
          type: 'ClientError',
          name: 'IncorrectPassword',
          message: 'Incorrect password',
        });
      }
    });

    test('Should fail login when user is inactive', async () => {
      // Change the user in test DB to inactive
      const userInDB = await DAC.db.findUserByUsername('chris');
      if (userInDB) {
        userInDB.active = 'inactive';
        await DAC.db.updateUser(userInDB);
      } else {
        throw new Error('User not found');
      }

      const authInfo: IAuth = {
        email: '',
        username: 'chris',
        password: 'pwd123',
      };

      try {
        await axios.post(`${HOST}:${PORT}/auth/api/tokens`, authInfo);
        fail('Expected request to fail with status 400 but it succeeded');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axios.isAxiosError(axiosError)).toBe(true); // Check it's an Axios error
        expect(axiosError.response?.status).toBe(400);
        expect(axiosError.response?.data).toEqual({
          type: 'ClientError',
          name: 'UserInactive',
          message: 'User is inactive, cannot login',
        });
      }
    });

    test('Should fail login when user has not agreed to terms', async () => {
      // Change the user in test DB to not verified (not agreed to terms)
      const userInDB = await DAC.db.findUserByUsername('chris');
      if (userInDB) {
        userInDB.agreedToTerms = false;
        await DAC.db.updateUser(userInDB);
      } else {
        throw new Error('User not found');
      }

      const authInfo: IAuth = {
        email: '',
        username: 'chris',
        password: 'pwd123',
      };

      try {
        await axios.post(`${HOST}:${PORT}/auth/api/tokens`, authInfo);
        fail('Expected request to fail with status 400 but it succeeded');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axios.isAxiosError(axiosError)).toBe(true); // Check it's an Axios error
        expect(axiosError.response?.status).toBe(400);
        expect(axiosError.response?.data).toEqual({
          type: 'ClientError',
          name: 'UserNotAgreedToTerms',
          message: 'Please agree to the terms and conditions',
        });
      }
    });
  });
});

describe('Integration Tests: Authentication and User Management', () => {
  const PORT = 4015; // test port

  beforeAll(async () => {
    // Initialize App with in-memory DB
    app = new App([new AuthController('/auth')], {
      port: PORT,
      host: HOST,
      clientDir: dummyStaticPath,
      db: new InMemoryDB(), // in-memory DB for testing
      url: `${HOST}:${PORT}`,
      initOnStart: true,
    });

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

  test('Should register a user successfully', async () => {
    // no need to prepopulate the in-memory DB
    // form and send a request to register a user
    const credentials: IAuth = {
      username: 'chris',
      email: 'minghuay@andrew.cmu.edu',
      password: 'pwd123',
    };
    const res = await axios.post(`${HOST}:${PORT}/auth/api/users`, credentials);
    // check the response
    expect(res.status).toBe(201);
    expect(res.data.name).toBe('UserRegistered');
    expect(res.data.message).toBe(`User chris registered successfully`);
    // check the user object
    const user: IUser = res.data.payload;
    const expectedUser = {
      credentials: {
        username: 'chris',
        email: 'minghuay@andrew.cmu.edu',
      },
      online: false,
      agreedToTerms: false,
      verified: true,
      active: 'active',
      role: 'member',
    };
    expect(user).toMatchObject(expectedUser);

    // check the database object
    const userInDB = await DAC.db.findUserByUsername('chris');
    expect(userInDB).not.toBeNull();
    expect(userInDB).toMatchObject(expectedUser);
  });

  test('Should not register a user if same username already exist', async () => {
    // prepopulate the in-memory DB with a not acknowledeged and not verfiied user
    const chirsCred: IAuth = {
      username: 'chris',
      email: 'minghuay@andrew.cmu.edu',
      password: 'pwd123',
    };
    const chris: User = new User(chirsCred);
    await chris.join();

    // form and send a request to register a user
    const credentials: IAuth = {
      username: 'chris',
      email: 'minghuay@andrew.cmu.edu',
      password: 'pwd123',
    };

    try {
      const res = await axios.post(
        `${HOST}:${PORT}/auth/api/users`,
        credentials
      );
      fail('Expected request to fail with status 400 but it succeeded');
    } catch (error) {
      const axiosError = error as AxiosError;
      expect(axios.isAxiosError(axiosError)).toBe(true); // Check it's an Axios error
      expect(axiosError.response?.status).toBe(400);
      expect(axiosError.response?.data).toEqual({
        type: 'ClientError',
        name: 'UserExists',
        message: 'User already exists',
      });
    }
  });

  test('Should verfiy a user email successfully', async () => {
    // prepopulate the in-memory DB with a not acknowledeged and not verfiied user
    const credentials: IAuth = {
      username: 'chris',
      email: 'minghuay@andrew.cmu.edu',
      password: 'pwd123',
    };
    const chris: User = new User(credentials);
    await chris.join();

    // form and send a request to validate a user email
    const otp = EmailUtils.generateOTP(credentials.email!);
    const verfication: IVerification = {
      username: 'chris',
      email: 'minghuay@andrew.cmu.edu',
      OTP: otp,
    };

    const res = await axios.post(
      `${HOST}:${PORT}/auth/apif/verify`,
      verfication
    );
    // check the response
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('UserVerified');
    expect(res.data.message).toBe(`User verified successfully`);

    // check the database object
    const expectedUser = {
      credentials: {
        username: 'chris',
        email: 'minghuay@andrew.cmu.edu',
      },
      online: false,
      agreedToTerms: false,
      verified: true,
      active: 'active',
      role: 'member',
    };
    const userInDB = await DAC.db.findUserByUsername('chris');
    expect(userInDB).not.toBeNull();
    expect(userInDB).toMatchObject(expectedUser);
  });

  test('Should acknowledge to terms and conditions successfully', async () => {
    // prepopulate the in-memory DB with a not acknowledeged and not verfiied user
    const credentials: IAuth = {
      username: 'chris',
      email: 'minghuay@andrew.cmu.edu',
      password: 'pwd123',
    };
    const chris: User = new User(credentials);
    await chris.join();

    // form and send a request to acknowledge a user
    const res = await axios.post(
      `${HOST}:${PORT}/auth/apif/users/ack`,
      credentials
    );
    // check the response
    expect(res.status).toBe(200);

    const expectedUser = {
      credentials: {
        username: 'chris',
        email: 'minghuay@andrew.cmu.edu',
      },
      online: false,
      agreedToTerms: true,
      verified: true,
      active: 'active',
      role: 'member',
    };
    // check the user object
    const updatedUser: IUser = res.data;
    expect(updatedUser).toMatchObject(expectedUser);

    // check the database object
    const userInDB = await DAC.db.findUserByUsername('chris');
    expect(userInDB).not.toBeNull();
    expect(userInDB).toMatchObject(expectedUser);
  });
});
