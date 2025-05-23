// This is the model for user profiles
// It is used by the controllers to access functionality related Profiles, including database access

import { IProfile } from '../../common/profile.interface';
import DAC from '../db/dac';
import { IAppError } from '../../common/server.responses';
import { v4 as uuidV4 } from 'uuid';
import { defaultAvatarId } from '../assets/defaultAvatar';

export class Profile implements IProfile {
  userId: string;

  _id: string;

  picture: string;

  favoriteFoods: string[];

  dietRestrictions: string[];

  visibility: 'public' | 'private';

  followers: string[];

  constructor(userId: string) {
    this.userId = userId;
    this._id = uuidV4();
    this.picture = defaultAvatarId;
    this.favoriteFoods = [];
    this.dietRestrictions = [];
    this.visibility = 'public';
    this.followers = [];
  }

  async save(): Promise<IProfile> {
    const profile = await DAC.db.findProfileByUserId(this.userId);
    if (profile) {
      throw {
        type: 'ClientError',
        name: 'ProfileExists',
        message: 'Profile already exists',
      } as IAppError;
    }
    return await DAC.db.saveProfile(this);
  }

  static async getProfile(userId: string): Promise<IProfile> {
    const profile = await DAC.db.findProfileByUserId(userId);
    if (!profile) {
      throw {
        type: 'ClientError',
        name: 'ProfileNotFound',
        message: 'Profile not found',
      } as IAppError;
    }
    return profile;
  }

  static async updateProfile(profile: IProfile): Promise<IProfile> {
    return await DAC.db.updateProfile(profile);
  }

  static async getFollowingIds(userId: string): Promise<string[]> {
    return await DAC.db.findAllFollowingIds(userId);
  }

  static async getTotalLikesReceived(userId: string): Promise<number> {
    return await DAC.db.countLikesReceived(userId);
  }
}
