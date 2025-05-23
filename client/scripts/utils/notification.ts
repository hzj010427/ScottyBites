// TODO: insert to all the html pages
import axios from 'axios';

import { IPost } from '../../../common/post.interface';
import { alertError } from './alertModal';
import { fetchUserAvatar, fetchPost } from '../post/services/post.service';
import { socket } from './socket';

const token = localStorage.getItem('token');

async function fetchUserName(userId: string): Promise<string> {
  const response = await axios.get(`/account/api/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const user = response.data.payload;
  return user.credentials.username;
}

async function handleNewPost(postId: string) {
  try {
    const post: IPost = await fetchPost(postId);
    const postTitle: string = post.title;
    const postOwnerId: string = post.owner_id;

    const postOwnerAvatar: string = await fetchUserAvatar(postOwnerId);
    const postOwnerName: string = await fetchUserName(postOwnerId);

    const notification = document.createElement('div');
    notification.className =
      'notification-popup d-flex align-items-center bg-light p-2 rounded shadow';

    notification.innerHTML = `
      <img
        src="${postOwnerAvatar}"
        alt="User 1"
        class="rounded-circle me-2"
        style="width: 40px; height: 40px; cursor: pointer"
        onclick="window.location.href='/profile/pages/${postOwnerId}'"
      />
      <div
        class="d-flex flex-column"
        style="cursor: pointer"
        onclick="window.location.href='/post/pages/full/${postId}'"
      >
        <strong class="d-block fs-6">
          <span class="d-inline">${postOwnerName}</span>
          SHARED SOMETHING NEW!
        </strong>
        <p class="mb-0 fs-6">${postTitle}</p>
      </div>
      <button
        class="btn ms-auto p-0 text-dark d-flex align-items-center"
        style="font-size: 1.5rem; border: none; cursor: pointer"
      >
        ×
      </button>
    `;

    // close button
    const closeBtn = notification.querySelector('button');
    closeBtn?.addEventListener('click', () => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 500);
    });

    document.body.appendChild(notification);

    // auto remove notification
    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  } catch (error) {
    alertError(error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  socket.on('newPost', handleNewPost);
});
