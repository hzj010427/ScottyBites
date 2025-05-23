import axios from 'axios';
import { IResponse } from '../../../common/server.responses';
import * as bootstrap from 'bootstrap';

export function alertError(error: unknown) {
  // Check if the error is an Axios error and has a response
  if (axios.isAxiosError(error) && error.response) {
    // Extract the error message from the response data
    const errorResponse = error.response.data as IResponse;
    showAlert(errorResponse.message || 'An unexpected error occurred.');
  } else {
    // Handle unexpected errors
    showAlert('An unexpected error occurred.');
  }
}

/**
 * Display a toast alert on the page
 */
export function showAlert(message: string, type: "success" | "error" = "error") {
  const toastEl = document.getElementById('toast');
  if (!toastEl) {
    return;
  }
  const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastEl);
  const alertMsg = document.getElementById('alertMsg');
  const alertDiv = document.getElementById("toastAlert");

  if (alertMsg) {
    alertMsg.innerHTML = message;
  }

  if (alertDiv) {
    // Update toast div color based on type (used in verify new email)
    // success: green, error: red
    if (type === "success") {
      alertDiv.classList.remove("alert-danger");
      alertDiv.classList.add("alert-success");
    } else {
      alertDiv.classList.remove("alert-success");
      alertDiv.classList.add("alert-danger");
    }
  }

  toastBootstrap.show();
}
