import React from 'react';

export default function OffCanvas({ userId }: { userId: string }) {
  function handleLogout() {
    localStorage.clear();
    window.location.href = '/';
  }
  
  return (
    <div
      className="offcanvas offcanvas-end border border-primary"
      id="offcanvasRight"
      aria-labelledby="offcanvasRightLabel"
    >
      <div className="offcanvas-header">
        <h5 className="offcanvas-title" id="offcanvasRightLabel">
          Menu
        </h5>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        ></button>
      </div>
      <div className="offcanvas-body text-center offcanvas-custom">
        <a
          href={`/profile/pages/${userId}`}
          className="btn w-100 py-3 mb-3 fs-4 menu-link"
        >
          My Profile
        </a>
        <a
          href="/directory/pages/access"
          className="btn w-100 py-3 mb-3 fs-4 menu-link"
        >
          Members
        </a>
        <a href="/post/pages/feed" className="btn w-100 py-3 mb-3 fs-4 menu-link">
          Posts
        </a>
        <a href="/business/pages/catalog" className="btn w-100 py-3 mb-3 fs-4 menu-link">
          Businesses
        </a>
        <a href="/map/pages/access" className="btn w-100 py-3 mb-3 fs-4 menu-link">
          Map View
        </a>
        <button type="button" className="btn w-100 py-3 mt-5 fs-5 logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
