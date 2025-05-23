import axios from 'axios';
import { forceSocketReconnect } from './socket';
import { IUpdatedUser } from '../../../common/user.interface';
import { IResponse } from '../../../common/server.responses';

// Check if the user is authenticated
export function redirectIfNotAuthenticated(
  token: string | null,
  userId: string | null,
  redirectUrl = '/auth/pages/access'
) {
  if (!token || !userId) {
    console.log('❌ User not authenticated, redirecting to login page...');
    window.location.href = redirectUrl;
    return true; // redirected
  }
  return false;
}

// Function to handle logout
export async function handleLogout(
  token: string | null,
  userId: string | null
) {
  if (redirectIfNotAuthenticated(token, userId)) return;

  try {
    console.log('🔴 Logging out...');

    // Clear all user session data
    localStorage.clear();

    console.log('User logged out successfully. Redirecting...');
    window.location.href = '/auth/pages/access'; // Redirect to login page
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

// Star SVGs for Business Ratings
const fullStarSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#FDB515" class="bi bi-star-fill" viewBox="0 0 16 16">
    <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
  </svg>`;

const halfStarSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#FDB515" class="bi bi-star-half" viewBox="0 0 16 16">
    <path d="M5.354 5.119 7.538.792A.52.52 0 0 1 8 .5c.183 0 .366.097.465.292l2.184 4.327 4.898.696A.54.54 0 0 1 16 6.32a.55.55 0 0 1-.17.445l-3.523 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256a.5.5 0 0 1-.146.05c-.342.06-.668-.254-.6-.642l.83-4.73L.173 6.765a.55.55 0 0 1-.172-.403.6.6 0 0 1 .085-.302.51.51 0 0 1 .37-.245zM8 12.027a.5.5 0 0 1 .232.056l3.686 1.894-.694-3.957a.56.56 0 0 1 .162-.505l2.907-2.77-4.052-.576a.53.53 0 0 1-.393-.288L8.001 2.223 8 2.226z"/>
  </svg>`;

const emptyStarSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#FDB515" class="bi bi-star" viewBox="0 0 16 16">
    <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.56.56 0 0 0-.163-.505L1.71 6.745l4.052-.576a.53.53 0 0 0 .393-.288L8 2.223l1.847 3.658a.53.53 0 0 0 .393.288l4.052.575-2.906 2.77a.56.56 0 0 0-.163.506l.694 3.957-3.686-1.894a.5.5 0 0 0-.461 0z"/>
  </svg>`;

// Function to create star ratings
export function generateStarRating(rating: number): string {
  if (rating == null || rating == 0) {
    return `<div class="star-rating">${emptyStarSvg.repeat(5)}</div>`;
  }

  let fullStars = Math.floor(rating);
  let hasHalfStar = false;

  const decimal = rating % 1;

  if (decimal >= 0.75) {
    fullStars += 1;
  } else if (decimal >= 0.25) {
    hasHalfStar = true;
  }

  const totalStars = 5;
  const emptyStars = totalStars - fullStars - (hasHalfStar ? 1 : 0);

  let starsHtml = '';
  for (let i = 0; i < fullStars; i++) starsHtml += fullStarSvg;
  if (hasHalfStar) starsHtml += halfStarSvg;
  for (let i = 0; i < emptyStars; i++) starsHtml += emptyStarSvg;

  return `<div class="star-rating">${starsHtml}</div>`;
}

// Function to fetch image with authorization headers
export async function fetchImageWithAuth(
  businessId: string,
  token: string
): Promise<string> {
  try {
    const response = await axios.get(
      `/business/api/businesses/${businessId}/picture`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      }
    );

    const imageUrl = URL.createObjectURL(response.data);
    return imageUrl;
  } catch (error) {
    console.error('Error fetching image:', error);
    return '/path/to/default/image.jpg'; // Fallback image
  }
}

export function setupSearchButton(
  searchButtonId: string,
  searchInputId: string,
  handleSearch: (query: string) => Promise<void>
) {
  const searchButton = document.querySelector(`#${searchButtonId}`);
  const searchInput = document.querySelector(`#${searchInputId}`) as HTMLInputElement;
  
  if (searchButton) {
    searchButton.addEventListener('click', () => handleSearch(searchInput.value));
  } else {
    console.error('Search button not found.');
  }
}

export function setupClearButton(searchInputId: string, clearButtonId: string) {
  const searchInput = document.querySelector(
    `#${searchInputId}`
  ) as HTMLInputElement;
  const clearButton = document.getElementById(clearButtonId);

  if (searchInput && clearButton) {
    clearButton.style.display = 'none';

    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim() !== '') {
        clearButton.style.display = 'block';
      } else {
        clearButton.style.display = 'none';
      }
    });

    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      clearButton.style.display = 'none';
      searchInput.focus();
      window.location.reload();
    });
  }
}

export function displayFieldError(
  field: string,
  message: string,
  selectorType: 'id' | 'name' = 'id'
) {
  const selector =
    selectorType === 'id' ? `[id="${field}"]` : `[name="${field}"]`;
  const fieldElement = document.querySelector(selector) as HTMLElement;

  if (!fieldElement) {
    console.warn(`No form field found for error field: ${field}`);
    return;
  }

  // Ensure there isn't an existing error message for this field
  const existingError =
    fieldElement.parentElement?.querySelector('.field-error');
  if (existingError) {
    existingError.textContent = message;
    return;
  }

  // Create and insert error message
  const errorElement = document.createElement('div');
  errorElement.className = 'field-error text-danger small mt-1';
  errorElement.textContent = message;

  fieldElement.parentElement?.appendChild(errorElement);
}
