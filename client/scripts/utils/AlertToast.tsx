import * as bootstrap from 'bootstrap';
import React from 'react';

/**
 * Display a toast alert on the page
 */
export function showAlertToast(message: string) {
  const toastEl = document.getElementById('toast');
  if (!toastEl) {
    return;
  }
  const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastEl);
  document.getElementById('alertMsg')!.innerText = message;
  toastBootstrap.show();
}

/**
 * Display an error alert on the page
 */
export function AlertToast() {
  return (
    <div
      id="toast"
      className="toast align-items-center border-0 mb-2 position-fixed bottom-0 start-50 translate-middle-x"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{ zIndex: 9999 }}
    >
      <div className="alert alert-danger mb-0 d-flex justify-content-between align-items-center">
        <span id="alertMsg">{/*Alert message goes here*/}</span>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="toast"
          aria-label="Close"
        ></button>
      </div>
    </div>
  );
}
