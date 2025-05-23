import DAC from '../../../server/db/dac';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import { User } from '../../../server/models/user.model';
import { IAuth } from '../../../common/user.interface';
import { Profile } from '../../../server/models/profile.model';
import { IUpdateProfile } from '../../../common/profile.interface';

describe('Profile Model Tests', () => {
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

  test('New user should have default profile', async () => {
    const userProfile = await Profile.getProfile(user._id);
    expect(userProfile).toEqual({
      userId: user._id,
      _id: expect.any(String),
      picture: 'default-avatar',
      dietRestrictions: [],
      favoriteFoods: [],
      visibility: 'public',
      followers: [],
    });
  });

  test('Creating duplicate profile should throw error', async () => {
    const duplicateProfile = new Profile(user._id);
    await expect(duplicateProfile.save()).rejects.toEqual({
      type: 'ClientError',
      name: 'ProfileExists',
      message: 'Profile already exists',
    });
  });

  test('Getting non-existing profile should throw error', async () => {
    await expect(Profile.getProfile('non-existent-id')).rejects.toEqual({
      type: 'ClientError',
      name: 'ProfileNotFound',
      message: 'Profile not found',
    });
  });

  test('Should update profile', async () => {
    // Update some fields in the existing profile
    profile.picture = 'new-avatar';
    profile.favoriteFoods.push('pizza');
    const updatedProfile = await Profile.updateProfile(profile);
    expect(updatedProfile).toEqual({
      userId: user._id,
      _id: profile._id,
      picture: 'new-avatar',
      dietRestrictions: [],
      favoriteFoods: ['pizza'],
      visibility: 'public',
      followers: [],
    });
  });

  test('Update profile with non-existing userId should throw error', async () => {
    profile.userId = 'non-existent-id';
    await expect(Profile.updateProfile(profile)).rejects.toEqual({
      type: 'ClientError',
      name: 'ProfileNotFound',
      message: 'Profile not found',
    });
  });
});
