import axios from 'axios';
import { IAuth, IUser } from '../../common/user.interface';
import { handleLogout, displayFieldError } from './utils/commonUtils';
import { socket } from './utils/socket';

// Retrieves the authentication token from local storage.
const token = localStorage.getItem('token');

// Used for new email validation
const authInfo: IAuth = {
  email: '',
  username: '',
  password: '',
};

// Store full user data for comparison
let storedUserData: IUser | null = null;

/**
 * Get My Info
 * @returns IUser | null
 */
function getMyInfo(): IUser | null {
  const currentUser = localStorage.getItem('user');
  return currentUser ? JSON.parse(currentUser) : null;
}

/**
 * Extracts the user ID from the current URL.
 * Assumes the URL follows the pattern: /account/pages/edit/{userId}
 */
function getUserIdFromUrl(): string | null {
  const pathSegments = window.location.pathname.split('/');
  return pathSegments.length > 3 ? pathSegments[3] : null;
}

/**
 * Populates the form fields with user data.
 */
function populateForm(user: IUser) {
  (document.querySelector('input[name="username"]') as HTMLInputElement).value =
    user.credentials.username;
  (document.querySelector('input[name="email"]') as HTMLInputElement).value =
    user.credentials.email || '';
  // (document.querySelector('input[name="password"]') as HTMLInputElement).value =
  //   user.credentials.password; // This should ideally be hashed and not shown
  (document.querySelector('select[name="active"]') as HTMLSelectElement).value =
    user.active;
  (document.querySelector('select[name="role"]') as HTMLSelectElement).value =
    user.role;

  if (getMyInfo()?.verified === false) {
    showVerificationIcon();
  }

  // Get My Role
  const myRole = getMyInfo()?.role || 'member';

  // Apply restrictions based on role
  applyRoleRestrictions(myRole);
}

/**
 * Disables/enables form fields based on the user's role.
 */
function applyRoleRestrictions(role: string) {
  const usernameField = document.querySelector(
    'input[name="username"]'
  ) as HTMLInputElement;
  const emailField = document.querySelector(
    'input[name="email"]'
  ) as HTMLInputElement;
  const roleField = document.querySelector(
    'select[name="role"]'
  ) as HTMLSelectElement;

  if (role === 'member') {
    // Members cannot modify privilege level
    roleField.disabled = true;
    roleField.style.backgroundColor = '#e9ecef'; // Grey out
  } else if (role === 'admin') {
    // Admins cannot modify username and email
    usernameField.disabled = true;
    emailField.disabled = true;
    usernameField.style.backgroundColor = '#e9ecef';
    emailField.style.backgroundColor = '#e9ecef';
  }
}

/**
 * Fetches user details from the API and fills the form.
 */
async function fetchUserData(
  userId: string,
  token: string
): Promise<IUser | null> {
  try {
    console.log('Fetching user data...');
    const response = await axios.get(`/account/api/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    handleSuccessfulFetch(response.data.payload);
    return response.data.payload;
  } catch (error) {
    console.error('Error fetching user data:', error.response?.data || error);
    return null;
  }
}

/**
 * Handles the successful retrieval of user data.
 */
function handleSuccessfulFetch(userData: IUser) {
  console.log('User data retrieved:', userData);
  storedUserData = userData; // Store for later comparison
  storedUserData.credentials.password = ''; // Keep password blank

  if (userData._id === getMyInfo()?._id) {
    localStorage.setItem('user', JSON.stringify(userData)); // Update local storage
  }

  // Store fetched user data in `authInfo`
  authInfo.email = userData.credentials.email;
  authInfo.username = userData.credentials.username;
  authInfo.password = 'Not Need Here'; // Keep password blank for security
}

/**
 * Fetches user details and populates the form.
 */
async function loadUserData(userId: string, token: string): Promise<void> {
  console.log('Initializing user data loading...');

  if (!userId) {
    console.error('User ID is missing.');
    return;
  }

  if (!token) {
    console.error('Authorization token is missing.');
    return;
  }

  try {
    const userData = await fetchUserData(userId, token);

    if (userData) {
      populateForm(userData);
    } else {
      console.warn('Failed to retrieve user data.');
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

/**
 * Retrieves the stored value for comparison.
 */
function getStoredValue(field: string): string {
  if (!storedUserData) return '';

  switch (field) {
    case 'email':
      return storedUserData.credentials.email || '';
    case 'username':
      return storedUserData.credentials.username;
    case 'password':
      return storedUserData.credentials.password;
    case 'active':
      return storedUserData.active;
    case 'role':
      return storedUserData.role;
    default:
      return '';
  }
}

/**
 * Collects form data and ensures only editable fields are submitted.
 */
function getFormData(): Record<string, string> {
  if (!storedUserData) {
    console.error('Stored user data is missing.');
    return {};
  }

  const authForm = document.getElementById('authForm') as HTMLFormElement;
  const formData = new FormData(authForm);
  // Get My Role
  const myRole = getMyInfo()?.role || 'member';
  // Get allowed fields based on role
  const allowedFields = getAllowedFields(myRole);

  return collectEditableFormData(formData, allowedFields);
}

/**
 * Retrieves the allowed fields for a given role.
 */
function getAllowedFields(role: string): string[] {
  const editableFields: Record<string, string[]> = {
    admin: ['password', 'active', 'role'],
    member: ['username', 'email', 'password', 'active'],
  };
  return editableFields[role] || [];
}

/**
 * Checks if a field has changed compared to the stored value,
 * then collects the data for submission.
 */
function collectEditableFormData(
  formData: FormData,
  allowedFields: string[]
): Record<string, string> {
  const requestData: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (allowedFields.includes(key)) {
      const storedValue = getStoredValue(key);
      if (storedValue !== value) {
        requestData[key] = value as string;
      }
    }
  }
  return requestData;
}

/**
 * Checks if any field has changed before sending the request.
 */
function checkFieldChanged(data: Record<string, string>): boolean {
  if (Object.keys(data).length === 0) {
    console.log('No changes detected. No request sent.');
    return false;
  }
  return true;
}

/**
 * Sends a PATCH request to update user account details.
 */
async function updateUserAccount(
  userId: string,
  token: string,
  data: Record<string, string>
) {
  clearFieldErrors(); // Remove previous errors before submission
  if (checkFieldChanged(data)) {
    // Only send request if any fields have changed
    const submitButton = document.getElementById(
      'submitButton'
    ) as HTMLButtonElement;

    try {
      submitButton.disabled = true; // Prevent multiple submissions

      const response = await axios.patch(`/account/api/users/${userId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      handleSuccessfulUpdate(userId, response.data.payload);
    } catch (error) {
      handleUpdateError(error);
    } finally {
      submitButton.disabled = false; // Re-enable button
    }
  }
}

/**
 * Handles successful update of user account.
 */
function handleSuccessfulUpdate(userId: string, updatedUser: IUser) {
  alert('Success: User account updated successfully!');
  // Get My Id
  const myId = getMyInfo()?._id;

  // Update localStorage with new user data if it's me
  if (userId === myId) {
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }

  // Update stored user data
  storedUserData = updatedUser;
  storedUserData.credentials.password = ''; // Keep password blank

  // Update authInfo in memory
  authInfo.email = updatedUser.credentials.email;
  authInfo.username = updatedUser.credentials.username;
  authInfo.password = 'Not Need Here';

  (document.querySelector('input[name="password"]') as HTMLInputElement).value =
    ''; // Clear password field

  // If email was updated, add the verification icon
  if (updatedUser.verified === false) {
    showVerificationIcon();
  } else {
    window.location.href = '/directory/pages/access';
  }
}

/**
 * Handles errors during the update process.
 */
function handleUpdateError(error: { response: { data: { message: string } } }) {
  console.error('Error updating account:', error.response?.data || error);

  if (axios.isAxiosError(error) && error.response?.data?.message) {
    try {
      const parsedErrors = JSON.parse(error.response.data.message);

      if (Array.isArray(parsedErrors)) {
        parsedErrors.forEach(({ field, message }) => {
          displayFieldError(field, message, 'name');
        });
      } else {
        alert('An unknown error occurred. Please check your input.');
      }
    } catch (parseError) {
      alert(`Error: ${error.response?.data?.message || 'An error occurred.'}`);
    }
  } else {
    alert('An unexpected error occurred.');
  }
}

/**
 * Handles the form submission.
 */
function handleFormSubmit(event: Event) {
  event.preventDefault();

  const userId = getUserIdFromUrl();

  if (!userId) {
    alert('User ID not found in the URL.');
    return;
  }
  if (!token) {
    alert('Authorization token is missing. Please log in.');
    return;
  }

  const requestData = getFormData();
  updateUserAccount(userId, token, requestData);
}

/**
 * Clears any previous error messages from the form.
 */
function clearFieldErrors() {
  const errorElements = document.querySelectorAll('.field-error');
  errorElements.forEach((element) => element.remove());
}

/**
 * Function to show the email verification icon
 */
function showVerificationIcon() {
  const verifyIcon = document.getElementById('email-verify-icon');
  if (verifyIcon) {
    verifyIcon.classList.remove('d-none'); // Show icon
    verifyIcon.addEventListener('click', validateNewEmail);
  }
}

/**
 * Function to validate the new email
 */
async function validateNewEmail() {
  console.log('Validating new email...');
  try {
    const { data } = await axios.post(`/auth/apif/validate/email`, {
      email: authInfo.email,
    });
    localStorage.setItem('username', authInfo.username);
    localStorage.setItem('email', authInfo.email!);
    localStorage.setItem('password', authInfo.password);

    // Redirect to the verification page
    window.location.href = '/auth/pages/verification?mode=update';
  } catch (error) {
    console.error('Error validating new email:', error);
  }
}

async function onUpdateActiveStatus(user: IUser): Promise<void> {
  if (!token) {
    console.error('Authorization token is missing.');
    return;
  }

  console.log('📢 Received user status update:', user);
  if (user._id === getMyInfo()?._id && user.active === 'inactive') {
    console.log('🔴 User account has been deactivated. Logging out...');
    handleLogout(token, user._id);
  }
}

// When the page loads, attach the form submit handler
document.addEventListener('DOMContentLoaded', async function (e: Event) {
  const userId = getUserIdFromUrl();

  // Update the online status to true after connecting to the socket
  socket.on('connect', () => {
    console.log('🔌 Connected to the server socket');
  });

  // Listen for updates from the server
  socket.on('updatedUser', onUpdateActiveStatus);

  if (userId && token) {
    await loadUserData(userId, token);
  } else {
    alert('User authentication is required.');
  }

  const authForm = document.getElementById('authForm');
  if (authForm) {
    authForm.addEventListener('submit', handleFormSubmit);
  }
});
