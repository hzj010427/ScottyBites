import { IUser } from '../../common/user.interface';
import { handleLogout, redirectIfNotAuthenticated } from './utils/commonUtils';
import { socket } from './utils/socket';
import handleSearch from './utils/searchHandler';
import { setupSearchButton, setupClearButton } from './utils/commonUtils';
import axios from 'axios';

// Get authentication details from localStorage
const user = localStorage.getItem('user');
const userId = user ? JSON.parse(user)._id : '';
const token = localStorage.getItem('token');

// Render Online/Offline User Lists
function renderUserLists(onlineUsers: IUser[], offlineUsers: IUser[]) {
  const lists = {
    online: document.querySelector(
      '.list-group.online-users'
    ) as HTMLDivElement,
    offline: document.querySelector(
      '.list-group.offline-users'
    ) as HTMLDivElement,
  };

  if (!lists.online || !lists.offline) return;

  // Clear existing user lists
  lists.online.innerHTML = '';
  lists.offline.innerHTML = '';

  // Render users based on their status
  renderUserGroup(onlineUsers, lists.online, true);
  renderUserGroup(offlineUsers, lists.offline, false);
}

// Helper function to render a group of users
function renderUserGroup(
  users: IUser[],
  container: HTMLDivElement,
  isOnline: boolean
) {
  const className = isOnline
    ? 'list-group-item border border-danger-subtle shadow-sm p-3'
    : 'list-group-item bg-light p-3';

  users.forEach((user) => {
    const listItem = document.createElement('div');
    listItem.className = className;
    listItem.appendChild(userButton(user));
    container.appendChild(listItem);
  });
}

/**
 * Create a username button, and attach a click event listener to navigate to the user's profile
 */
function usernameButton(username: string, userId: string) {
  const button = document.createElement('button');
  button.className = 'btn btn-link';
  button.textContent = username;
  button.setAttribute('data-user-id', userId);
  button.addEventListener('click', () => {
    window.location.href = `/profile/pages/${userId}`;
  });
  return button;
}

/**
 * Create a user button, and attach a click event listener to navigate to the user's profile
 */
function userButton(user: IUser) {
  const button = document.createElement('button');
  button.className = 'btn btn-link';
  // display username and email
  if (user.credentials.email) {
    button.textContent = `${user.credentials.username} (${user.credentials.email})`;
  } else {
    button.textContent = `${user.credentials.username}`;
  }
  button.setAttribute('data-user-id', user._id);
  button.addEventListener('click', () => {
    window.location.href = `/profile/pages/${user._id}`;
  });
  return button;
}

// Socket event listener for user status updates
function onUpdateOnlineOfflineUsers(users: IUser[]) {
  console.log('📢 Received updated user list:', users);
  const myRole = getMyInfo()?.role; // Retrieve current user role
  if (!myRole) return;

  let filteredUsers: IUser[] = [];

  if (myRole === 'admin') {
    // Admin sees all users
    filteredUsers = users;
  } else if (myRole === 'member') {
    // Members exclude users with active: inactive
    filteredUsers = users.filter((user) => user.active !== 'inactive');
  }

  // Separate users into online and offline lists
  let onlineUsers = filteredUsers.filter((user) => user.online);
  let offlineUsers = filteredUsers.filter((user) => !user.online);

  // Sort users alphabetically by username
  const sortAlphabetically = (a: IUser, b: IUser) =>
    a.credentials.username.localeCompare(b.credentials.username);

  onlineUsers = onlineUsers.sort(sortAlphabetically);
  offlineUsers = offlineUsers.sort(sortAlphabetically);

  renderUserLists(onlineUsers, offlineUsers);
}

function getMyInfo(): IUser | null {
  const currentUser = localStorage.getItem('user');
  return currentUser ? JSON.parse(currentUser) : null;
}

function removeUserFromLists(user: IUser) {
  // Get the online and offline user lists
  const onlineUsersList = document.querySelector(
    '.list-group.online-users'
  ) as HTMLDivElement;
  const offlineUsersList = document.querySelector(
    '.list-group.offline-users'
  ) as HTMLDivElement;

  if (!onlineUsersList || !offlineUsersList) return;

  // Helper function to remove user from a list
  const removeUserFromList = (list: HTMLDivElement, userId: string) => {
    const items = list.querySelectorAll('.list-group-item');
    items.forEach((item) => {
      const button = item.querySelector('button');
      if (button && button.getAttribute('data-user-id') === userId) {
        item.remove();
      }
    });
  };

  const activeStatus = user.active;
  const onlineStatus = user.online;

  if (activeStatus === 'inactive') {
    // If user becomes inactive, remove them from both lists
    removeUserFromList(onlineUsersList, user._id);
    removeUserFromList(offlineUsersList, user._id);
  } else if (activeStatus === 'active') {
    // If user becomes active again, re-add them to the correct list based on online status
    const targetList = onlineStatus ? onlineUsersList : offlineUsersList;

    // Remove from both lists first to avoid duplicates
    removeUserFromList(onlineUsersList, user._id);
    removeUserFromList(offlineUsersList, user._id);

    // Create the list item
    const listItem = document.createElement('div');
    listItem.className = onlineStatus
      ? 'list-group-item border border-danger-subtle shadow-sm p-3'
      : 'list-group-item bg-light p-3';
    listItem.appendChild(usernameButton(user.credentials.username, user._id));

    // Append to the correct list
    targetList.appendChild(listItem);
  }
}

async function onUpdateStatus(user: IUser): Promise<void> {
  if (!token) {
    console.error('Authorization token is missing.');
    return;
  }

  console.log('📢 Received user active status update:', user);
  if (user._id === getMyInfo()?._id) {
    localStorage.setItem('user', JSON.stringify(user)); // update local storage
    if (user.active === 'inactive') {
      console.log('🔴 User account has been deactivated. Logging out...');
      handleLogout(token, userId);
    }
  } else {
    const myRole = getMyInfo()?.role;

    if (myRole === 'admin') return; // Admin does not need to update the UI

    // Remove the user from the online or offline list if the role is "member"
    if (myRole === 'member') {
      removeUserFromLists(user);
    }
  }
}

function AddMyProfileLink() {
  const myProfileLink = document.getElementById(
    'myProfileLink'
  ) as HTMLAnchorElement;
  if (myProfileLink) {
    myProfileLink.href = `/profile/pages/${userId}`;
  }
}

const mockUsers: IUser[] = [
  {
    _id: '1',
    credentials: {
      username: 'john_doe',
      email: 'john.doe@example.com',
      password: 'hashed_password',
    },
    online: true,
    active: 'active',
    agreedToTerms: true,
    verified: true,
    role: 'member',
  },
  {
    _id: '2',
    credentials: {
      username: 'jane_smith',
      email: 'jane.smith@example.com',
      password: 'hashed_password',
    },
    online: false,
    active: 'active',
    agreedToTerms: true,
    verified: true,
    role: 'member',
  },
];

// Simulate the response structure
const response = {
  data: {
    payload: mockUsers,
  },
};

// Specific search function for users
const searchUsers = async (query: string): Promise<IUser[]> => {
  const response = await axios.get(`/account/api/users`, {
    params: { q: query },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.payload;
};

// When the page loads, check authentication and initialize socket connection
document.addEventListener('DOMContentLoaded', async function (e: Event) {
  // Check if the user is authenticated
  if (redirectIfNotAuthenticated(token, userId)) return;

  // Listen for updates from the server
  socket.on('allUsers', onUpdateOnlineOfflineUsers);
  // Listen for active status updates
  socket.on('updatedUser', onUpdateStatus);

  // Attach logout event listener
  const logoutButton = document.querySelector('.logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => handleLogout(token, userId));
  }

  // Add link to My Profile
  AddMyProfileLink();

  // Setup search button and clear button
  setupSearchButton('searchButton', 'searchInput', async (query) =>
    handleSearch(query, searchUsers, onUpdateOnlineOfflineUsers)
  );
  setupClearButton('searchInput', 'clearButton');

  console.log('Directory Page loaded successfully');
});
