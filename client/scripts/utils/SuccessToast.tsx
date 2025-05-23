import * as bootstrap from 'bootstrap';
import React from 'react';
/**
 * Display a toast alert on the page
 */
export function showSuccessToast(message: string, onClose?: () => void) {
  const toastEl = document.getElementById('successToast');
  if (!toastEl) {
    return;
  }
  const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastEl);
  document.getElementById('successToastMsg')!.innerText = message;

  // Add an event listener for when the toast is hidden
  toastEl.addEventListener('hidden.bs.toast', () => {
    if (onClose) {
      onClose();
    }
  });

  toastBootstrap.show();
}

/**
 * Display an error alert on the page
 */
export function SuccessToast() {
  return (
    <div
      id="successToast"
      className="toast align-items-center border-0 mb-2 position-fixed bottom-0 start-50 translate-middle-x"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{ zIndex: 9999 }}
    >
      <div className="alert alert-success mb-0 d-flex justify-content-between align-items-center">
        <span id="successToastMsg">{/*Alert Message Goes here*/}</span>
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
