import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';

import { IProfile } from '../../../../common/profile.interface';
import { updateProfilePicture } from '../services/profileServices';

export default function AvatarModal({
  profile,
  setProfile,
}: {
  profile: IProfile;
  setProfile: Dispatch<SetStateAction<IProfile | null>>;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    // Handle modal hidden event (cleanup file selection and alert message)
    const avatarModal = document.getElementById('avatarModal');
    if (avatarModal) {
      const handleModalHidden = () => {
        setSelectedFile(null);
        setAlertMessage('');
      };
      avatarModal.addEventListener('hidden.bs.modal', handleModalHidden);
      return () => {
        avatarModal.removeEventListener('hidden.bs.modal', handleModalHidden);
      };
    }
  }, []);

  function displayedImage() {
    if (selectedFile) {
      return (
        <img
          src={URL.createObjectURL(selectedFile)}
          alt="Selected Avatar"
          className="profile-avatar"
        />
      );
    } else {
      return (
        <img
          src={`/blob/${profile?.picture}`}
          alt="Profile Avatar"
          className="profile-avatar"
        />
      );
    }
  }

  async function uploadPicture() {
    if (!selectedFile) {
      return;
    }
    const updatedProfile = await updateProfilePicture(
      profile.userId,
      selectedFile
    );
    if (!updatedProfile) {
      setAlertMessage('Upload failed. Please try again.');
      return;
    }
    // Add a timestamp to the picture URL to force a refresh
    setProfile({
      ...updatedProfile,
      picture: `${updatedProfile.picture}?t=${new Date().getTime()}`,
    });
    setSelectedFile(null);
    setAlertMessage('Upload successful.');
  }

  function onSelectFile() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 1000000) {
          setAlertMessage('File size must be less than 1 MB.');
          return;
        }
        setSelectedFile(file);
        setAlertMessage('');
      }
    };
    fileInput.click();
  }

  return (
    <div className="modal" id="avatarModal" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <h2 className="modal-title text-center p-2">Edit Profile Picture</h2>

          {/*Displayed Image*/}
          <div className="row mb-3">
            <div className="col d-flex justify-content-center">
              {displayedImage()}
            </div>
          </div>

          {/*Buttons*/}
          <div className="row mb-3">
            <div className="col d-flex justify-content-center gap-3">
              {/*Select File Button*/}
              <button className="btn btn-primary" onClick={onSelectFile}>
                Select File
              </button>
              {/*Upload Button*/}
              {selectedFile && (
                <button className="btn btn-primary" onClick={uploadPicture}>
                  Upload
                </button>
              )}
            </div>
          </div>

          {/*Alert Message*/}
          {alertMessage && (
            <div className="row mb-3">
              <div className="col d-flex justify-content-center justify-content-center">
                <p>{alertMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
