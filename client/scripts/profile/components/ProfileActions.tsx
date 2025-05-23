import { IProfile } from '../../../../common/profile.interface';
import React, { Dispatch, SetStateAction } from 'react';

import { toggleFollow } from '../services/profileServices';
import { showAlertToast } from '../../utils/AlertToast';
import { forceSocketReconnect } from '../../utils/socket';

function followButton(
  profile: IProfile,
  setProfile: Dispatch<SetStateAction<IProfile | null>>,
  followerId: string
) {
  const isFollowing = profile.followers.includes(followerId);
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={async () => {
        try {
          const newProfile = await toggleFollow(profile.userId, followerId);
          setProfile(newProfile);
          forceSocketReconnect();
        } catch (error) {
          if (typeof error === 'string') {
            console.log('Error: ', error);
            showAlertToast(error);
          }
        }
      }}
    >
      {isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  );
}

export default function ProfileActions({
  profile,
  setProfile,
  myId,
  myRole,
  setIsEditing,
}: {
  profile: IProfile;
  setProfile: Dispatch<SetStateAction<IProfile | null>>;
  myId: string;
  myRole: string;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div className="d-flex justify-content-center gap-3">
      {(myRole === 'admin' || myId === profile.userId) && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            window.location.href = `/account/pages/${profile.userId}`;
          }}
        >
          Edit Account
        </button>
      )}
      {myId === profile.userId && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setIsEditing(true);
          }}
        >
          Edit Profile
        </button>
      )}
      {myId !== profile.userId &&
        profile.visibility === 'public' &&
        followButton(profile, setProfile, myId)}
    </div>
  );
}
