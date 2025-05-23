import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';

import Header from './components/Header';
import ProfileInfo from './components/ProfileInfo';
import OffCanvas from './components/OffCanvas';
import ProfileActions from './components/ProfileActions';
import AvatarModal from './components/AvatarModal';
import EditProfilePage from './EditProfilePage';
import PostSection from './components/PostSection';

import { IProfile } from '../../../common/profile.interface';
import { getProfile } from './services/profileServices';
import { AlertToast, showAlertToast } from '../utils/AlertToast';
import { SuccessToast } from '../utils/SuccessToast';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import React from 'react';

const currentUser = localStorage.getItem('user');
const userInfo = currentUser ? JSON.parse(currentUser) : null;
const myRole = userInfo?.role;
const myId = userInfo?._id;
const userId = getUserID(); // UserId of the profile being viewed

function getUserID() {
  const url = window.location.href;
  const urlParts = url.split('/');
  return urlParts[urlParts.length - 1];
}

function ProfilePage() {
  const [profile, setProfile] = useState<IProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Load the profile
    getProfile(userId).then((profile) => {
      if (!profile) {
        showAlertToast(
          'An unexpected error occurred while loading the profile.'
        );
        return;
      }
      setProfile(profile);
    });
  }, [userId]);

  function onToggleEditing() {
    setIsEditing(!isEditing);
  }

  // render the main page or editing page based on the state
  function mainPage() {
    if (!profile) {
      return (
        <div className="d-flex flex-column justify-content-center align-items-center">
          <p>User Not Found.</p>
          <p>Please try navigate from main page again.</p>
        </div>
      );
    }
    if (!userId) {
      return (
        <p>
          Wrong userId in the URL. Please try navigate from main page again.
        </p>
      );
    }
    if (isEditing) {
      return (
        <EditProfilePage
          profile={profile}
          setIsEditing={setIsEditing}
          setProfile={setProfile}
        />
      );
    } else {
      return (
        <>
          {/*ProfileInfo*/}
          <ProfileInfo profile={profile} myId={myId} myRole={myRole} />
          {/*Profile Action Buttons*/}
          <ProfileActions
            profile={profile}
            setProfile={setProfile}
            setIsEditing={onToggleEditing}
            myId={myId}
            myRole={myRole}
          />
          {/*Posts Section*/}
          <PostSection
            myId={myId}
            userId={userId}
            isPrivate={profile.visibility == 'private'}
          />
        </>
      );
    }
  }

  return (
    <>
      <div className="container d-flex flex-column align-items-center vh-100">
        {/*Header*/}
        <Header />
        {/*Main Content*/}
        <div className="container d-flex justify-content-center vh-100">
          <div className="row vw-100 pt-5 mt-4 justify-content-center">
            <div className="col col-xl-6 col-lg-7 col-md-8 col-sm-10 col-12">
              {mainPage()}
            </div>
          </div>
        </div>
      </div>
      {/*OffCanvas Menu*/}
      <OffCanvas userId={myId} />
      {/*Alert Toast*/}
      <AlertToast />
      {/*Success Toast*/}
      <SuccessToast />
      {/*Avatar Modal*/}
      {profile && <AvatarModal profile={profile} setProfile={setProfile} />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<ProfilePage />);
