import axios from 'axios';
import { IBusiness } from '../../common/business.interface';
import { fetchImageWithAuth, generateStarRating, redirectIfNotAuthenticated } from './utils/commonUtils';

// Get authentication details from localStorage
const user = localStorage.getItem('user');
const userId = user ? JSON.parse(user)._id : '';
const token = localStorage.getItem('token');
// Select the restaurant info container
const restaurantInfoContainer = document.getElementById('restaurant-info-essential');

/**
 * Parse the business id from the URL
 */
function getBusinessID() {
  const url = window.location.href;
  const urlParts = url.split('/');
  return urlParts[urlParts.length - 1];
}

// Function to generate contact information
function generateContactInfo(business: IBusiness): string {
  let contactInfo = '';

  if (business.phone) {
    contactInfo += `<p><strong>Phone:</strong> ${business.phone}</p>`;
  }

  if (business.email) {
    contactInfo += `<p><strong>Email:</strong> <a href="mailto:${business.email}" class="contact-link">${business.email}</a></p>`;
  }

  if (business.website) {
    const websiteUrl = business.website.startsWith('http://') || business.website.startsWith('https://')
      ? business.website
      : `https://${business.website}`;
    contactInfo += `<p><strong>Website:</strong> <a href="${websiteUrl}" target="_blank" class="contact-link">${business.website}</a></p>`;
  }

  if (contactInfo) {
    return `
      <div class="contact-info mt-3">
        <h5 class="contactInfoDiv fw-bold">Contact Information</h5>
        ${contactInfo}
      </div>
      <hr class="separator">
    `;
  }

  return '';
}

// Helper function to generate the restaurant profile HTML
function generateRestaurantProfileHTML(business: IBusiness, imageUrl: string, contactInfo: string): string {
  return `
    <div class="p-4 text-center">
      <!-- Restaurant Name & Image -->
      <div>
        <img src="${imageUrl}" class="restaurant-profile-image img-fluid rounded" alt="${business.name}">
        <h2 class="mt-3 fw-bold restaurant-name">${business.name}</h2>
      </div>

      <!-- Rating & Category -->
      <p class="mt-2 d-flex align-items-center justify-content-center rating-container">
        <span class="me-2">${generateStarRating(business.rating || 0)}</span> 
        <span class="text-muted">(${business.numReviews || 0} reviews)</span>
      </p>
      <p class="text-muted text-center fw-semibold">${business.category.join(', ')}</p>

      <!-- Location & Description -->
      <!-- Location Row -->
      <div class="row location justify-content-center">
        <div class="col-auto">
          <p class="fw-bold location-text d-flex align-items-center justify-content-center">
            <span class="location-label d-flex align-items-center">
              <button type="button" class="btn p-0 border-0 bg-transparent d-inline-flex align-items-center" 
                      title="View ${business.name} Location on Map" 
                      onclick="window.location.href='/map/pages/access'">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#c41230" class="bi bi-geo-alt-fill me-1" viewBox="0 0 16 16">
                  <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/>
                </svg>
              </button>
              <span>Location:</span>
            </span>
            <span class="location-details ms-2 d-flex align-items-center">${business.address}</span>
          </p>
        </div>
      </div>

      <div class="row">
        <div class="col">
          <p class="text-muted">${business.description}</p>
        </div>
      </div>

      <hr class="separator">

      <!-- Contact Information -->
      ${contactInfo}
    </div>
  `;
}

// Refactored loadRestaurantProfile function
async function loadRestaurantProfile() {
  try {
    const restaurantId = getBusinessID();

    if (!restaurantId) {
      restaurantInfoContainer!.innerHTML = `<p class="text-danger">Invalid restaurant ID</p>`;
      return;
    }

    // Store business id in session storage
    const businessIds: string[] = [restaurantId];
    sessionStorage.setItem('businessIds', JSON.stringify(businessIds));

    // Fetch restaurant details
    const response = await axios.get(`/business/api/businesses/${restaurantId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const business: IBusiness = response.data.payload;
    console.log('Fetched restaurant:', business);

    // Fetch the restaurant image
    const imageUrl = await fetchImageWithAuth(business._id, token!);

    // Generate contact information
    const contactInfo = generateContactInfo(business);

    // Generate and render the profile HTML
    const profileHTML = generateRestaurantProfileHTML(business, imageUrl, contactInfo);
    restaurantInfoContainer!.innerHTML = profileHTML;
  } catch (error) {
    console.error('Error fetching restaurant profile:', error);
    restaurantInfoContainer!.innerHTML = `<p class="text-danger">Failed to load restaurant details. Please try again later.</p>`;
  }
}

// Run the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Check if the user is authenticated
  if (redirectIfNotAuthenticated(token, userId)) return;
  
  // Load the restaurant profile
  await loadRestaurantProfile();
  console.log('Restaurant Profile Page Loaded.');
});
