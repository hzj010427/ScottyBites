import axios from 'axios';
import { IAuth, IVerification } from '../../common/user.interface';
import * as bootstrap from 'bootstrap';

import { alertError, showAlert } from './utils/alertModal';

let authInfo: IAuth = {
  email: '',
  username: '',
  password: '',
};

/**
 * Check if the input is a number and move to the next input field
 */
function onOTPInput(): void {
  const inputs: NodeListOf<HTMLInputElement> =
    document.querySelectorAll('#otp > *[id]');

  inputs.forEach((input: HTMLInputElement, index: number): void => {
    input.addEventListener('keydown', (event: KeyboardEvent): void => {
      // Move to the previous input field if the Backspace key is pressed
      if (event.key === 'Backspace') {
        input.value = '';
        if (index !== 0) {
          (inputs[index - 1] as HTMLInputElement).focus();
        }
      } else {
        // Check if the input is a number and move to the next input field
        const isNumber: boolean = /^[0-9]$/.test(event.key);
        if (isNumber) {
          input.value = event.key;
          if (index !== inputs.length - 1) {
            (inputs[index + 1] as HTMLInputElement).focus();
          } else {
            input.blur(); // Lose focus on the last input field
            submitOTP();
          }
        } else {
          input.value = '';
        }
        event.preventDefault();
      }
    });
  });
}

/**
 * Get the OTP from the input fields
 */
function getOTP(): string {
  const inputs = document.querySelectorAll('#otp > *[id]');
  let otp = '';
  inputs.forEach((input) => {
    otp += (input as HTMLInputElement).value;
  });
  return otp;
}

/**
 * Send a request to the server to verify the OTP
 */
async function submitOTP(): Promise<void> {
  // Get the OTP from the input fields
  const otp: string = getOTP();
  const verification: IVerification = {
    email: authInfo.email!,
    username: authInfo.username,
    OTP: otp,
  };

  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode") || "register";

  try {
    if (mode === "update") {
      // If user is verifying an updated email
      await axios.post(`/auth/apif/verify`, verification);
      console.log("Email update verification successful");

      localStorage.removeItem("email");
      localStorage.removeItem("username");
      localStorage.removeItem("password");

      showAlert("Email successfully updated! Return to Directory...", "success");
      setTimeout(() => {
        window.location.href = "/directory/pages/access"; // Redirect
      }, 2000);
    } else {
      // Default registration process
      await axios.post(`/auth/apif/verify`, verification);
      console.log('Verification successful');
      // Show confirmation modal
      const modalEl = document.getElementById('confirmModal');
      const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalEl);
      modalBootstrap.show();
    }
  } catch (error) {
    alertError(error);
  }
}

/**
 * Register the user
 */
async function register() {
  localStorage.clear();
  try {
    await axios.post('/auth/api/users', authInfo);
    console.log(
      `Successfully registered ${authInfo.email} as ${authInfo.username}`
    );
    // Show terms modal
    const modalEl = document.getElementById('termsModal');
    const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalBootstrap.show();
  } catch (error) {
    alertError(error);
  }
}

/**
 * Send Acknowledgment of the terms to server
 */
async function sendAck() {
  try {
    await axios.post(`/auth/apif/users/ack`, authInfo);
    console.log('Acknowledgement updated successfully');
    // Redirect to the directory page
    window.location.href = '/directory/pages/access';
  } catch (error) {
    alertError(error);
  }
}

/**
 * Add a message to the emailNote element
 */
function updateEmailNote() {
  const emailNote = document.getElementById('emailNote');
  const email = localStorage.getItem('email');
  if (emailNote && email) {
    emailNote.innerHTML = `An OTP has been sent to ${localStorage.getItem(
      'email'
    )}. <br>It will expire in 10 minutes.`;
  }
}

/**
 * Load the user data from the local storage
 */
function loadUserData() {
  // Load the user data from the local storage
  const username: string | null = localStorage.getItem('username');
  const email: string | null = localStorage.getItem('email');
  const password: string | null = localStorage.getItem('password');
  if (!(username && email && password)) {
    showAlert('User data missing. Redirecting to register page...');
    // Wait for 2 seconds before redirecting to the access page
    setTimeout(() => {
      window.location.href = '/auth/pages/access';
    }, 2000);
    return;
  }
  // Set the user data in the authInfo object
  authInfo = {
    email: email,
    username: username,
    password: password,
  };
}

document.addEventListener('DOMContentLoaded', () => {
  // Add event listener to the OTP input fields
  onOTPInput();
  // Add message to the emailNote element
  updateEmailNote();

  // Load the user data from the local storage
  loadUserData();

  // Add event listener to the register button
  const registerButton = document.getElementById('registerButton');
  registerButton?.addEventListener('click', register);

  // Add event listener to the register button
  const ackButton = document.getElementById('ackButton');
  ackButton?.addEventListener('click', sendAck);
});
