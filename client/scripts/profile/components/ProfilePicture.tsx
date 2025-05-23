/**
 * The profile picture of the user, and clicking on it opens the edit modal.
 */

import React from 'react';
import { IProfile } from '../../../../common/profile.interface';
import * as bootstrap from 'bootstrap';

function editProfilePicture() {
  const avatarModal = document.getElementById('avatarModal');
  if (!avatarModal) {
    return;
  }
  const modalBootstrap = bootstrap.Modal.getOrCreateInstance(avatarModal);
  modalBootstrap.show();
  if (avatarModal) {
    avatarModal.classList.remove('d-none');
    avatarModal.setAttribute('aria-hidden', 'false');
  }
}

export default function ProfilePicture({ profile }: { profile: IProfile }) {
  return (
    <>
      <button
        type="button"
        className="btn rounded-circle p-0 border-0"
        onClick={editProfilePicture}
      >
        <img
          className="profile-avatar"
          src={`/blob/${profile?.picture}`}
          alt="Profile Avatar"
        />
      </button>
    </>
  );
}
