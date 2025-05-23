import axios from 'axios';
import { IResponse } from '../../common/server.responses';
import { IAuth, IUser } from '../../common/user.interface';
import * as bootstrap from 'bootstrap';

import { alertError, showAlert } from './utils/alertModal';

let authInfo: IAuth = {
  email: '',
  username: '',
  password: '',
};

async function login(authInfo: IAuth) {
  console.log('login user');
  if (!authInfo.username || authInfo.username === '') {
    showAlert('Username is required');
    return;
  }

  if (!authInfo.password || authInfo.password === '') {
    showAlert('Password is required');
    return;
  }

  try {
    const { data } = await axios.post(`/auth/api/tokens`, authInfo);
    // Extract user data from the response
    const user: IUser = data.payload.user;
    const token = data.payload.token;

    if (!token) {
      showAlert('Token not found in response');
      return;
    }

    // Store the userInfo and token in localStorage
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    console.log('Login successful');
    // Redirect to the directory page
    window.location.href = '/directory/pages/access';
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // Extract the error message from the response data
      const errorResponse = error.response.data as IResponse;
      if (errorResponse.name === 'UserNotAgreedToTerms') {
        // Show terms modal
        const modalEl = document.getElementById('termsModal');
        const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalEl!);
        modalBootstrap.show();
      } else {
        showAlert(errorResponse.message || 'An unexpected error occurred.');
      }
    } else {
      // Handle unexpected errors
      showAlert('An unexpected error occurred.');
    }
  }
}

/**
 * Send Acknowledgment of the terms to server
 */
async function sendAck() {
  try {
    await axios.post(`/auth/apif/users/ack`, authInfo);
    console.log('Acknowledgement updated successfully');
    // login the user again
    await login(authInfo);
  } catch (error) {
    alertError(error);
  }
}

async function validateRegister() {
  console.log('Validating registration info');
  try {
    const { data } = await axios.post(`/auth/apif/validate`, authInfo);
    // Extract sanitized user data from the response
    const { username } = data.payload;
    // Store the username, email, and password in localStorage
    localStorage.setItem('username', username);
    localStorage.setItem('email', authInfo.email!);
    localStorage.setItem('password', authInfo.password);
    console.log('Validation successful');
    // Redirect to the verification page
    window.location.href = '/auth/pages/verification';
  } catch (error) {
    alertError(error);
  }
}

/*
 * Send a request to the server to validate the user's credentials
 */
async function onSubmitForm(e: SubmitEvent) {
  // form submission event handler
  e.preventDefault(); // prevent default form submission

  // get the user data from the form
  authInfo = getFormData();

  // check if email is provided
  if (!authInfo.email || authInfo.email === '') {
    // login flow
    login(authInfo);
  } else {
    // register flow
    validateRegister();
  }
}

/**
 * Get the user data from the auth form
 */
function getFormData(): IAuth {
  const formData = new FormData(
    document.getElementById('authForm') as HTMLFormElement
  );
  const username = formData.get('username') as string;
  const authInfo: IAuth = {
    email: formData.get('email') as string,
    username: username ? username.toLocaleLowerCase() : '',
    password: formData.get('password') as string,
  };
  return authInfo;
}

document.addEventListener('DOMContentLoaded', async function (e: Event) {
  // document-ready event handler
  console.log('Page loaded successfully');

  // add event listener to the form
  document.getElementById('authForm')?.addEventListener('submit', onSubmitForm);
  // Add event listener to the register button
  const ackButton = document.getElementById('ackButton');
  ackButton?.addEventListener('click', sendAck);
});
