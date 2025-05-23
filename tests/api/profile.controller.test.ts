import { Server } from 'http';
import App from '../../server/app';
import ProfileController from '../../server/controllers/profile.controller';
import AuthController from '../../server/controllers/auth.controller';
import axios, { AxiosError } from 'axios';
import DAC from '../../server/db/dac';
import { InMemoryDB } from '../../server/db/inMemory.db';
import { Profile } from '../../server/models/profile.model';
import { IAuth } from '../../common/user.interface';
import { User } from '../../server/models/user.model';
import path from 'path';

describe('Integration Tests: Profile Controller', () => {
  const PORT = 4090;
  const HOST = 'http://localhost';
  const dummyStaticPath = path.join(__dirname, '..');
  let server: Server;
  let testUser: User;
  let token: string;
  let headers = {
    Authorization: '',
  };

  beforeAll(async () => {
    const app = new App(
      [new ProfileController('/profile'), new AuthController('/auth')],
      {
        port: PORT,
        host: HOST,
        clientDir: dummyStaticPath,
        db: new InMemoryDB(),
        url: `${HOST}:${PORT}`,
        initOnStart: true,
      }
    );

    server = await app.listen();
  });

  beforeEach(async () => {
    await DAC._db.init();

    // Create a new user and login
    const credentials: IAuth = {
      username: 'testuser',
      password: 'testpassword',
    };
    testUser = new User({ ...credentials });
    await testUser.join();
    await User.acknowledgeUser(credentials.username);

    const res = await axios.post(
      `${HOST}:${PORT}/auth/api/tokens`,
      credentials
    );
    token = res.data.payload.token;
    headers = {
      Authorization: `Bearer ${token}`,
    };

    // Create a profile for the new user
    const profile = new Profile(testUser._id);
    await profile.save();
  });

  afterAll(() => {
    server.close();
  });

  describe('View Profile', () => {
    test('View valid profile by authenticated user should return profile', async () => {
      const res = await axios.get(
        `${HOST}:${PORT}/profile/api/${testUser._id}`,
        {
          headers,
        }
      );
      expect(res.status).toBe(200);
      expect(res.data.name).toBe('ProfileFound');
      expect(res.data.message).toBe('Profile found successfully');

      const profile = res.data.payload;
      const expectedProfile = {
        userId: testUser._id,
        _id: expect.any(String),
        picture: 'default-avatar',
        favoriteFoods: [],
        dietRestrictions: [],
        visibility: 'public',
        followers: [],
      };
      expect(profile).toEqual(expectedProfile);
    });

    test('View profile by unauthenticated user should fail', async () => {
      try {
        await axios.get(`${HOST}:${PORT}/profile/api/${testUser._id}`);
        fail('Erroroneously succeeded viewing profile without token');
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }
        const err = error as AxiosError;
        expect(err.response?.status).toBe(401);
        expect(err.response?.data).toEqual({
          type: 'ClientError',
          name: 'NoToken',
          message: 'No token provided',
        });
      }
    });

    test('View profile that does not exist should fail', async () => {
      try {
        await axios.get(`${HOST}:${PORT}/profile/api/invalidUserId`, {
          headers,
        });
        fail('Erroroneously succeeded viewing non-existing profile');
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }
        const err = error as AxiosError;
        expect(err.response?.status).toBe(404);
        expect(err.response?.data).toEqual({
          type: 'ClientError',
          name: 'ProfileNotFound',
          message: 'Profile not found',
        });
      }
    });

    test('View private profile should fail', async () => {
      const profile = new Profile('privateUser');
      profile.visibility = 'private';
      await profile.save();

      try {
        await axios.get(`${HOST}:${PORT}/profile/api/privateUser`, {
          headers,
        });
        fail('Erroroneously succeeded viewing private profile');
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }
        const err = error as AxiosError;
        expect(err.response?.status).toBe(403);
        expect(err.response?.data).toEqual({
          type: 'ClientError',
          name: 'PrivateProfile',
          message: 'Profile is private',
        });
      }
    });
  });

  describe('Update Profile', () => {
    test("Update one's own profile with valid fields should success", async () => {
      const updates = {
        favoriteFoods: ['burger', 'pizza'],
        dietRestrictions: ['vegetarian'],
        visibility: 'private',
      };

      const res = await axios.patch(
        `${HOST}:${PORT}/profile/api/${testUser._id}`,
        updates,
        { headers }
      );
      expect(res.status).toBe(200);
      expect(res.data.name).toBe('ProfileUpdated');
      expect(res.data.message).toBe('Profile updated successfully');

      const updatedProfile = await Profile.getProfile(testUser._id);
      const expectedProfile = {
        userId: testUser._id,
        _id: expect.any(String),
        picture: 'default-avatar',
        favoriteFoods: ['burger', 'pizza'],
        dietRestrictions: ['vegetarian'],
        visibility: 'private',
        followers: [],
      };
      expect(updatedProfile).toEqual(expectedProfile);
    });

    test('Update profile with invalid fields should fail', async () => {
      const updates = {
        favoriteFoods: ['pizza', 'sushi', 'cake', 'burger'], // Too many favorite foods
        visibility: 'invalidVisibility',
        dietRestrictions: ['invalidRestriction'],
      };

      try {
        await axios.patch(
          `${HOST}:${PORT}/profile/api/${testUser._id}`,
          updates,
          { headers }
        );
        fail('Erroroneously succeeded updating profile with invalid fields');
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }
        const err = error as AxiosError;
        expect(err.response?.status).toBe(400);
        expect(err.response?.data).toEqual({
          type: 'ClientError',
          name: 'FailedUpdateProfile',
          message: expect.stringContaining('Invalid'),
        });
      }
    });

    test("Update other user's profile should fail", async () => {
      const updates = {
        favoriteFoods: [],
        dietRestrictions: [],
        visibility: 'public',
      };

      try {
        await axios.patch(`${HOST}:${PORT}/profile/api/otherUser`, updates, {
          headers,
        });
        fail("Erroroneously succeeded updating other user's profile");
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }
        const err = error as AxiosError;
        expect(err.response?.status).toBe(403);
        expect(err.response?.data).toEqual({
          type: 'ClientError',
          name: 'UnauthorizedRequest',
          message: 'Unauthorized to update profile',
        });
      }
    });

    test('Follow other public user should success', async () => {
      const followeeProfile = new Profile('followeeId');
      await followeeProfile.save();

      const res = await axios.patch(
        `${HOST}:${PORT}/profile/api/followeeId/followers/${testUser._id}`,
        {},
        { headers }
      );

      expect(res.status).toBe(200);
      expect(res.data.name).toBe('ProfileUpdated');
      expect(res.data.message).toBe('Following status updated successfully');
      expect(res.data.payload.followers).toContain(testUser._id);

      const updatedFolloweeProfile = await Profile.getProfile('followeeId');
      expect(updatedFolloweeProfile.followers).toContain(testUser._id);
    });

    test('Follow private user should fail', async () => {
      const followeeProfile = new Profile('privateFolloweeId');
      followeeProfile.visibility = 'private';
      await followeeProfile.save();

      try {
        await axios.patch(
          `${HOST}:${PORT}/profile/api/privateFolloweeId/followers/${testUser._id}`,
          {},
          { headers }
        );
        fail('Erroroneously succeeded following private user');
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }
        const err = error as AxiosError;
        expect(err.response?.status).toBe(403);
        expect(err.response?.data).toEqual({
          type: 'ClientError',
          name: 'PrivateProfile',
          message: 'Profile is private',
        });
      }
    });

    test('Follow oneself should fail', async () => {
      try {
        await axios.patch(
          `${HOST}:${PORT}/profile/api/${testUser._id}/followers/${testUser._id}`,
          {},
          { headers }
        );
        fail('Erroroneously succeeded following oneself');
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }
        const err = error as AxiosError;
        expect(err.response?.status).toBe(400);
        expect(err.response?.data).toEqual({
          type: 'ClientError',
          name: 'FailedUpdateProfile',
          message: 'You cannot follow yourself',
        });
      }
    });

    test('Update profile picture should success', async () => {
      const formData = new FormData();
      const fakeFileContent = new Blob([Buffer.from('fake image content')], {
        type: 'image/png',
      });
      formData.append('picture', fakeFileContent, 'test.png');

      const res = await axios.patch(
        `${HOST}:${PORT}/profile/api/${testUser._id}/picture`,
        formData,
        {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      expect(res.status).toBe(200);
      expect(res.data.name).toBe('ProfileUpdated');
      expect(res.data.message).toBe('Profile picture updated successfully');

      const updatedProfile = await Profile.getProfile(testUser._id);
      expect(updatedProfile.picture).not.toBe('default-avatar');
    });

    test('Update profile picture larger than 1MB should fail', async () => {
      const formData = new FormData();
      const largeFileContent = new Blob(
        [Buffer.from('a'.repeat(1024 * 1024 + 1))], // 1MB plus 1 byte
        { type: 'image/png' }
      );
      formData.append('picture', largeFileContent, 'large.png');
      try {
        await axios.patch(
          `${HOST}:${PORT}/profile/api/${testUser._id}/picture`,
          formData,
          {
            headers: {
              ...headers,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        fail('Erroroneously succeeded updating picture larger than 1MB');
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }
        const err = error as AxiosError;
        expect(err.response?.status).toBe(400);
        expect(err.response?.data).toEqual({
          type: 'ClientError',
          name: 'FailedUpdateProfile',
          message: 'Profile picture must be 1MB or less',
        });
      }
    });
  });
});
