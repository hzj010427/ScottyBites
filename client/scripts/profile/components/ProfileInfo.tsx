/**
 * Profile Info Component: Avatar, Name, Favorite Foods, Counts
 */

import React, { useState, useEffect } from 'react';
import { IProfile } from '../../../../common/profile.interface';

import { showAlertToast } from '../../utils/AlertToast';
import ProfilePicture from './ProfilePicture';
import {
  getUsername,
  getTotalLikesReceived,
} from '../services/profileServices';

export default function ProfileInfo({
  profile,
  myId,
  myRole,
}: {
  profile: IProfile;
  myId: string;
  myRole: string;
}) {
  const [username, setUsername] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);

  useEffect(() => {
    // Check if the profile is private
    if (profile.visibility === 'private') {
      if (myId === profile.userId) {
        setIsPrivate(true);
      } else {
        showAlertToast('This profile is private.');
        if (myRole !== 'admin') {
          setUsername('Private Profile');
          return;
        }
      }
    }
    // Get the username
    getUsername(profile.userId).then((username) => {
      if (!username) {
        showAlertToast(
          'An unexpected error occurred while loading the username.'
        );
        return;
      }
      setUsername(username);
    });
    // Get the total likes received
    getTotalLikesReceived(profile.userId).then((totalLikes) => {
      setTotalLikes(totalLikes);
    });
  }, [profile.userId]);

  return (
    <>
      <div className="row mb-2 gap-3 d-flex justify-content-center align-items-center">
        {/*Profile Picture*/}
        <div className="col-auto p-0 m-0">
          <ProfilePicture profile={profile} />
        </div>
        {/*Name and favorite foods*/}
        <div className="col-auto mt-2">
          <div className="profile-info text-start">
            {/*Username*/}
            <h2>{username}</h2>
            {/*Favorite Foods*/}
            {profile?.favoriteFoods.length > 0 && (
              <>
                <p className="mb-0 pl-2">&nbsp;Favorite Foods</p>
                <div className="d-flex px-2 gap-2 justify-content-start flex-wrap">
                  {profile?.favoriteFoods.map((food, index) => (
                    <span className="badge food-badge">{food}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        {/*Notice of Private Profile*/}
        {isPrivate && (
          <div className="col-auto">
            <p className="text-danger">Your profile is currently private.</p>
          </div>
        )}
      </div>

      <div className="row gap-3 mb-2 d-flex justify-content-center align-items-center mx-5">
        {/*Counts*/}
        <div className="col-auto text-center">
          <h3 className="fs-5 mb-1">{profile?.followers.length}</h3>
          <p className="mb-1">Followers</p>
        </div>
        <div className="col-auto text-center">
          <h3 className="fs-5 mb-1">{totalLikes}</h3>
          <p className="mb-1">Likes</p>
        </div>
      </div>
    </>
  );
}
