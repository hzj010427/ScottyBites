import { IProfile, IUpdateProfile } from '../../common/profile.interface';
import { IAppError } from '../../common/server.responses';
import { sanitizeText } from './sanitizeText';
import { Blob } from '../models/blob.model';
import { defaultAvatarId } from '../assets/defaultAvatar';
import { validRestrictions, foodCategories } from '../../common/profileEntries';

export class ProfileUtils {
  /**
   * A dispatcher function to apply the updates to the profile object
   * @param profile The profile object to update
   * @param updates The updates to apply
   * @returns The updated profile object
   */
  public static applyFieldUpdates(
    profile: IProfile,
    updates: IUpdateProfile
  ): IProfile {
    let updatedProfile: IProfile = { ...profile };
    const errors: { field: string; message: string }[] = [];

    for (const [key, value] of Object.entries(updates)) {
      try {
        switch (key) {
          case 'favoriteFoods':
            updatedProfile = this.applyFavoriteFoods(updatedProfile, value);
            break;
          case 'dietRestrictions':
            updatedProfile = this.applyDietRestrictions(updatedProfile, value);
            break;
          case 'visibility':
            updatedProfile = this.applyVisibility(updatedProfile, value);
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
        name: 'FailedUpdateProfile',
        message: JSON.stringify(errors),
      } as IAppError;
    }

    return updatedProfile;
  }

  /**
   * Apply the favorite foods update to the profile object
   */
  public static applyFavoriteFoods(
    profile: IProfile,
    favoriteFoods: string[]
  ): IProfile {
    // Sanitize and enforce unique favorite foods
    favoriteFoods = [
      ...new Set(favoriteFoods.map((food) => sanitizeText(food).toLowerCase())),
    ];
    // Check for invalid foods
    const invalidFoods = favoriteFoods.filter(
      (food) => !foodCategories.includes(food)
    );
    if (invalidFoods.length > 0) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateProfile',
        message: `Invalid favorite foods: ${invalidFoods.join(', ')}`,
      } as IAppError;
    }
    // Check length
    if (favoriteFoods.length > 3) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateProfile',
        message: 'A maximum of 3 favorite foods is allowed',
      } as IAppError;
    }
    profile.favoriteFoods = favoriteFoods.map((food) =>
      sanitizeText(food).toLowerCase()
    );
    return profile;
  }

  /**
   * Apply the favorite foods update to the profile object
   */
  public static applyDietRestrictions(
    profile: IProfile,
    dietRestrictions: string[]
  ): IProfile {
    // Sanitize and remove duplicates
    dietRestrictions = [
      ...new Set(
        dietRestrictions.map((restriction) =>
          sanitizeText(restriction).toLowerCase()
        )
      ),
    ];
    // Check for invalid restrictions
    const invalidRestrictions = dietRestrictions.filter(
      (restriction) => !validRestrictions.includes(restriction)
    );
    if (invalidRestrictions.length > 0) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateProfile',
        message: `Invalid diet restrictions: ${invalidRestrictions.join(', ')}`,
      } as IAppError;
    }
    // Check length
    if (dietRestrictions.length > 6) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateProfile',
        message: 'Diet restrictions must be 6 or fewer',
      } as IAppError;
    }
    profile.dietRestrictions = dietRestrictions;
    return profile;
  }

  /**
   * Apply the visibility update to the profile object
   */
  public static applyVisibility(
    profile: IProfile,
    visibility: 'public' | 'private'
  ): IProfile {
    if (visibility !== 'public' && visibility !== 'private') {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateProfile',
        message: 'Visibility must be public or private',
      } as IAppError;
    }
    profile.visibility = visibility;
    return profile;
  }

  /**
   * Toggle follow/unfollow for a user
   * (follower_id) -> follow/unfollow -> profile
   */
  public static applyFollower(profile: IProfile, follower: string): IProfile {
    if (follower === profile.userId) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateProfile',
        message: 'You cannot follow yourself',
      } as IAppError;
    }

    const index = profile.followers.indexOf(follower);
    if (index === -1) {
      profile.followers.push(follower);
    } else {
      profile.followers.splice(index, 1);
    }

    return profile;
  }

  public static async applyPicture(
    profile: IProfile,
    pictureBuf: Buffer,
    originalName: string
  ): Promise<IProfile> {
    if (pictureBuf.length > 1000000) {
      throw {
        type: 'ClientError',
        name: 'FailedUpdateProfile',
        message: 'Profile picture must be 1MB or less',
      } as IAppError;
    }
    const extension = originalName.split('.').pop() || 'png';
    const mimeType = `image/${extension}`;

    // If the current picture is the default avatar, create a new picture
    if (profile.picture === defaultAvatarId) {
      const blob = new Blob(pictureBuf, mimeType);
      const newBlob = await blob.save();
      // Update the profile picture id
      profile.picture = newBlob._id;
    } else {
      // Update the existing picture
      const blob = await Blob.getBlob(profile.picture);
      if (!blob) {
        throw {
          type: 'ServerError',
          name: 'BlobNotFound',
          message: 'Profile picture not found',
        } as IAppError;
      }
      blob.buf = pictureBuf;
      await Blob.updateBlob(blob);
    }

    return profile;
  }
}

export default ProfileUtils;
