import axios from 'axios';
import { IResponse } from '../../../../common/server.responses';
import { IProfile, IUpdateProfile } from '../../../../common/profile.interface';
import { IUser } from '../../../../common/user.interface';
import { defaultAvatarId } from '../../../../server/assets/defaultAvatar';

const token = localStorage.getItem('token');

export async function getProfile(userId: string): Promise<IProfile | null> {
  try {
    const response = await axios.get(`/profile/api/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.payload;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorResponse = error.response.data as IResponse;
      console.error(errorResponse.message || 'An unexpected error occurred.');
      // Check if it is a private profile error
      if (errorResponse.name === 'PrivateProfile') {
        return {
          _id: '',
          userId: userId,
          visibility: 'private',
          favoriteFoods: [],
          dietRestrictions: [],
          picture: defaultAvatarId,
          followers: [],
        } as IProfile;
      }
    } else {
      console.error('An unexpected error occurred.');
    }
    return null;
  }
}

export async function getTotalLikesReceived(userId: string): Promise<number> {
  try {
    const response = await axios.get(`/profile/api/${userId}/likes-received`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.payload;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorResponse = error.response.data as IResponse;
      console.error(errorResponse.message || 'An unexpected error occurred.');
    } else {
      console.error('An unexpected error occurred.');
    }
    return 0;
  }
}

export async function getUsername(userId: string): Promise<string | null> {
  try {
    const response = await axios.get(`/account/api/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const user: IUser = response.data.payload;
    return user.credentials.username;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorResponse = error.response.data as IResponse;
      console.error(errorResponse.message || 'An unexpected error occurred.');
    } else {
      console.error('An unexpected error occurred.');
    }
    return null;
  }
}

export async function toggleFollow(
  followeeId: string,
  followerId: string
): Promise<IProfile> {
  try {
    const response = await axios.patch(
      `/profile/api/${followeeId}/followers/${followerId}`,
      { status: 'toggle' },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.payload as IProfile;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorResponse = error.response.data as IResponse;
      console.error(errorResponse);
      throw(errorResponse.message || 'An unexpected error occurred.');
    } else {
      console.error(error);
      throw('An unexpected error occurred.');
    }
  }
}

export async function updateProfilePicture(
  userId: string,
  picture: File
): Promise<IProfile | null> {
  try {
    const formData = new FormData();
    formData.append('picture', picture, 'avatar.png');
    const response = await axios.patch(
      `/profile/api/${userId}/picture`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.payload as IProfile;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorResponse = error.response.data as IResponse;
      alert(errorResponse.message || 'An unexpected error occurred.');
    } else {
      console.error('An unexpected error occurred.');
    }
    return null;
  }
}

export async function updateProfile(
  userId: string,
  profile: IUpdateProfile
): Promise<IProfile | null> {
  try {
    const response = await axios.patch(`/profile/api/${userId}`, profile, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.payload as IProfile;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorResponse = error.response.data as IResponse;
      alert(errorResponse.message || 'An unexpected error occurred.');
    } else {
      console.error('An unexpected error occurred.');
    }
    return null;
  }
}
