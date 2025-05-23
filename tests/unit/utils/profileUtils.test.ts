import { ProfileUtils } from '../../../server/utils/profileUtils';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import DAC from '../../../server/db/dac';
import { Profile } from '../../../server/models/profile.model';
import { IProfile, IUpdateProfile } from '../../../common/profile.interface';
import { User } from '../../../server/models/user.model';
import { IAuth } from '../../../common/user.interface';

describe('Profile Utils Tests', () => {
  let user: User;
  let profile: Profile;
  const credentials: IAuth = {
    email: 'newuser@test.cmu.edu',
    username: 'newuser',
    password: 'newuser',
  };

  beforeAll(async () => {
    DAC._db = new InMemoryDB();
    await DAC._db.init();

    user = new User(credentials);
    await user.join();
    profile = new Profile(user._id);
    await profile.save();
  });

  test('Update with valid fields should success', async () => {
    const updates: IUpdateProfile = {
      favoriteFoods: ['burger', 'pizza'],
      dietRestrictions: ['Vegetarian'],
      visibility: 'private',
    };

    expect(() => ProfileUtils.applyFieldUpdates(profile, updates)).not.toThrow();
  });

  test('Update invalid favorite foods should throw error', async () => {
    expect(() =>
      ProfileUtils.applyFavoriteFoods(profile, ['invalidFood'])
    ).toThrow(
      expect.objectContaining({
        type: 'ClientError',
        name: 'FailedUpdateProfile',
        message: expect.stringContaining('Invalid favorite food'),
      })
    );
  });

  test('Update with invalid diet restrictions should throw error', async () => {
    expect(() =>
      ProfileUtils.applyDietRestrictions(profile, ['invalidRestriction'])
    ).toThrow(
      expect.objectContaining({
        type: 'ClientError',
        name: 'FailedUpdateProfile',
        message: expect.stringContaining('Invalid diet restriction'),
      })
    );
  });

  test('Follow oneself should throw error', async () => {
    expect(() =>
      ProfileUtils.applyFollower(profile, user._id)
    ).toThrow(
      expect.objectContaining({
        type: 'ClientError',
        name: 'FailedUpdateProfile',
        message: expect.stringContaining('cannot follow'),
      })
    );
  });

  test('Update valid follower should success', async () => {
    expect(() =>
      ProfileUtils.applyFollower(profile, 'test')
    ).not.toThrow();
  });
});
