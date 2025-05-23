import axios from 'axios';
import { IBusiness } from '../../common/business.interface';
import {
  fetchImageWithAuth,
  generateStarRating,
  handleLogout,
  redirectIfNotAuthenticated,
  setupSearchButton,
  setupClearButton,
} from './utils/commonUtils';
import handleSearch from './utils/searchHandler';

// Get authentication details from localStorage
const user = localStorage.getItem('user');
const userId = user ? JSON.parse(user)._id : '';
const token = localStorage.getItem('token');
const restaurantList = document.getElementById('restaurant-list');

// Function to generate short description
function generateShortDescription(description: string): string {
  return description.length > 80
    ? description.substring(0, 80) + '...'
    : description;
}

async function createRestaurantCard(
  business: IBusiness
): Promise<HTMLDivElement> {
  const restaurantCard = document.createElement('div');
  restaurantCard.classList.add(
    'w-100',
    'mb-4',
    'd-flex',
    'justify-content-center'
  );

  const imageUrl = await fetchImageWithAuth(business._id, token!);

  restaurantCard.innerHTML = `
    <div class="card shadow-sm p-3 restaurant-card" data-id="${business._id}" style="cursor: pointer; border-radius: 15px;">
      <div class="row g-0 d-flex align-items-center">
        <!-- Image Section -->
        <div class="imageDiv col-4 d-flex align-items-center justify-content-center">
          <img src="${imageUrl}" class="img-fluid rounded-start" alt="${business.name}">
        </div>
        <div class="col-8">
          <div class="card-body">
            <h3 class="card-title fw-bold">${business.name}</h3>
            <p class="mb-1 d-flex align-items-center rating-container">
              ${generateStarRating(business.rating || 0)}
              <span class="text-muted">(${business.numReviews || 0} reviews)</span>
            </p>
            <p class="text-muted fw-semibold cuisine">${business.category.join(', ')}</p>
          </div>
        </div>
      </div>

      <!-- Location Row -->
      <div class="row location">
        <div class="col">
            <p class="fw-bold location-text">
                <span class="location-label">Location:</span> 
                <span class="location-details">${business.address}</span>
            </p>
        </div>
      </div>

      <!-- Description Row -->
      <div class="row">
        <div class="col">
          <p class="text-muted">${generateShortDescription(business.description)}</p>
        </div>
      </div>
    </div>
  `;

  // Add click event to navigate to the profile page
  restaurantCard.addEventListener('click', () => {
    window.location.href = `/business/pages/${business._id}`;
  });

  return restaurantCard;
}

async function insertBusinesses(businesses: IBusiness[]) {
  for (const business of businesses) {
    const restaurantCard = await createRestaurantCard(business);
    restaurantList?.appendChild(restaurantCard);
  }
}

// Function to fetch and display restaurants
async function loadRestaurants() {
  try {
    const response = await axios.get('/business/api/businesses', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Fetched businesses:', response.data);
    const businesses: IBusiness[] = response.data.payload.businesses;

    if (businesses.length === 0) {
      restaurantList!.innerHTML = `<p class="text-muted
          ">No restaurants found.</p>`;
      return;
    }

    // Store all business ids in session storage
    const businessIds: string[] = businesses.map((business) => business._id);
    sessionStorage.setItem('businessIds', JSON.stringify(businessIds));

    await insertBusinesses(businesses);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    restaurantList!.innerHTML = `<p class="text-danger">Failed to load restaurant data. Please try again later.</p>`;
  }
}

// Mock response data
const mockRateing = 3.6;
const mockReviews = 134;

const mockBusinesses: IBusiness[] = [
  {
    _id: '1',
    name: 'Test Business 1',
    address: '123 Test Street',
    category: ['Category 1', 'Category 2'],
    description: 'This is a test description for business 1.',
    phone: '123-456-7890',
    email: 'test1@example.com',
    website: 'https://test1.com',
    picture: 'default-avatar',
    rating: mockRateing,
    numReviews: mockReviews,
  },
  {
    _id: '2',
    name: 'Test Business 2',
    address: '456 Test Avenue',
    category: ['Category 3'],
    description: 'This is a test description for business 2.',
    phone: '987-654-3210',
    email: 'test2@example.com',
    website: 'https://test2.com',
    picture: 'default-avatar',
    rating: mockRateing,
    numReviews: mockReviews,
  },
];

// Simulate the response structure
const response = {
  data: {
    payload: mockBusinesses,
  },
};

// Function to search for businesses
async function searchBusinesses(query: string) {
  const response = await axios.get(`/business/api/businesses/`, {
    params: {
      q: query, // Add the query parameter
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.payload;
}

async function onSearchBusinessesSuccess(businesses: IBusiness[]) {
  restaurantList!.innerHTML = ''; // Clear previous results
  if (businesses.length === 0) {
    restaurantList!.innerHTML = `<p class="text-muted">No restaurants found.</p>`;
    return;
  }

  // Store all business ids in session storage
  const businessIds: string[] = businesses.map((business) => business._id);
  sessionStorage.setItem('businessIds', JSON.stringify(businessIds));

  await insertBusinesses(businesses);
}

function AddMyProfileLink() {
  const myProfileLink = document.getElementById(
    'myProfileLink'
  ) as HTMLAnchorElement;
  if (myProfileLink) {
    myProfileLink.href = `/profile/pages/${userId}`;
  }
}

// Add link to My Profile
AddMyProfileLink();

// Ensure the script runs only after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Check if the user is authenticated
  if (redirectIfNotAuthenticated(token, userId)) return;

  await loadRestaurants();
  console.log('Restaurant Catalog DOM loaded.');

  // Attach logout event listener
  const logoutButton = document.querySelector('.logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => handleLogout(token, userId));
  }
  // Setup search button and clear button
  setupSearchButton('searchButton', 'searchInput', async (query) =>
    handleSearch(query, searchBusinesses, onSearchBusinessesSuccess)
  );
  setupClearButton('searchInput', 'clearButton');
});
