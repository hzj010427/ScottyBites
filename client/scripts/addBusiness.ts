import axios from 'axios';
import { showAlert } from './utils/alertModal';
import {
  businessCategories,
  restaurantCategories,
} from '../../common/categories';
import { IBusiness } from '../../common/business.interface';
import { IMap } from '../../common/map.interface';
import dotenv from 'dotenv';
import { displayFieldError } from './utils/commonUtils';

dotenv.config();

const token = localStorage.getItem('token');

/**
 * Collects form data.
 */
function getFormData(): Record<string, string | string[] | File> {
  const businessForm = document.getElementById(
    'businessForm'
  ) as HTMLFormElement;
  const formData = new FormData(businessForm);

  // Initialize the request data object
  const requestData: Record<string, string | string[] | File> = {};

  // Iterate over form data and only include allowed fields
  for (const [key, value] of formData.entries()) {
    requestData[key] = value;
  }

  // Collect selected categories
  const selectedCategories = Array.from(
    document.getElementById('selectedCategories')!.children
  )
    .map((li) => li.firstChild?.textContent)
    .filter(Boolean) as string[];

  requestData['category'] = selectedCategories;

  return requestData;
}

/**
 * Adds a business by sending the form data to the API.
 */
async function addBusiness(
  requestData: Record<string, string | string[] | File>
) {
  const formData = buildBusinessFormData(requestData);
  const submitButton = document.getElementById(
    'submitButton'
  ) as HTMLButtonElement;

  // Send the form data to the API using axios
  try {
    submitButton.disabled = true; // Prevent multiple submissions

    // Save the business in db
    const response = await axios.post('/business/api/businesses', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    const savedBusiness: IBusiness = response.data.payload;
    saveBusinessMap(
      savedBusiness._id,
      savedBusiness.name,
      savedBusiness.address,
      savedBusiness.category
    );
    handleBusinessSuccess();
  } catch (error) {
    handleBusinessError(error);
  } finally {
    submitButton.disabled = false; // Re-enable button
  }
}

/**
 * Save the map data in db.
 */
async function saveBusinessMap(
  _id: string,
  name: string,
  address: string,
  category: string[]
) {
  try {
    const mapResponse = await axios.post(
      '/map/api/locations',
      {
        _id: _id,
        name: name,
        address: address,
        category: category,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const savedMap: IMap = mapResponse.data.payload;
    console.log('Saved map:', savedMap);
  } catch (error) {
    console.error('Error saving map:', error.response?.data || error);
  }
}

/**
 * Builds the form data for submission.
 */
function buildBusinessFormData(
  data: Record<string, string | string[] | File>
): FormData {
  // Prepare form data for submission
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (key === 'picture') {
      formData.append(key, value as File);
    } else if (key === 'category') {
      (value as string[]).forEach((item, index) => {
        formData.append(`${key}[${index}]`, item);
      });
    } else if (key === 'address address-search') {
      // Rename the key to 'address' for the API
      formData.append('address', value as string);
    } else {
      formData.append(key, value as string);
    }
  }
  return formData;
}

/**
 * Displays an alert message, then redirects to the catalog page.
 */
function handleBusinessSuccess() {
  showAlert('Business added successfully', 'success');
  setTimeout(() => {
    window.location.href = '/business/pages/catalog'; // Redirect
  }, 2000);
}

/**
 * Handles errors during the business addition process.
 */
function handleBusinessError(error: {
  response: { data: { message: string; name: string } };
}) {
  console.error('Error add business:', error.response?.data || error);

  if (axios.isAxiosError(error) && error.response?.data?.message) {
    if (error.response.data.name === 'NoToken') {
      showAlert('Login Required', 'error');
    } else {
      const errorData = error.response.data;
      displayFieldError(errorData.name, errorData.message, 'id');
    }
  } else {
    alert('An unexpected error occurred.');
  }
}

/**
 * Clears any previous error messages from the form.
 */
function clearFieldErrors() {
  const errorElements = document.querySelectorAll('.field-error');
  errorElements.forEach((element) => element.remove());
}

/**
 * Handles the form submission.
 */
async function handleFormSubmit(event: Event) {
  event.preventDefault();

  const requestData = getFormData();
  console.log('Form data:', requestData);
  // print the form data
  console.log(requestData);
  // addBusiness(requestData);
  // check for all the required fields
  const requiredFields = [
    'name',
    'address address-search',
    'category',
    'description',
    'picture',
  ];
  const missingFields = requiredFields.filter((field) => !requestData[field]);
  if (
    requiredFields.includes('category') &&
    !(requestData['category'] as string[]).length
  ) {
    missingFields.push('category');
  }
  if (
    requiredFields.includes('picture') &&
    !(requestData['picture'] as File).size
  ) {
    missingFields.push('picture');
  }
  // if there are missing fields, display an error message for each missing field
  if (missingFields.length) {
    clearFieldErrors();
    missingFields.forEach((field) => {
      console.log('This field is required.', field);
      displayFieldError(field, 'This field is required.', 'name');
    });
    return;
  }
  // clear all error messages on successful form submission
  clearFieldErrors();

  await addBusiness(requestData);
}

/**
 * Initializes the category autocomplete functionality.
 */
function initCategoryAutocomplete() {
  const categoryList = document.getElementById('categoryList');
  if (!categoryList) {
    console.error('Category list element not found');
    return;
  }

  const categories = businessCategories.concat(restaurantCategories);
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    categoryList.appendChild(option);
  });
}

/**
 * Initializes the category selection input.
 */
function initCategorySelectionInput() {
  const categoryInput = document.getElementById('category') as HTMLInputElement;
  const selectedCategories = document.getElementById(
    'selectedCategories'
  ) as HTMLUListElement;
  const categoryError = document.getElementById(
    'categoryError'
  ) as HTMLDivElement;

  categoryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const category = categoryInput.value.trim();
      if (category && !isCategorySelected(category, selectedCategories)) {
        addCategoryToList(category, selectedCategories);
        categoryInput.value = '';
        categoryError.style.display = 'none';
      } else {
        categoryError.textContent = 'Category already added';
        categoryError.style.display = 'block';
      }
    }
  });
}

/**
 * Checks if a category is already selected.
 */
function isCategorySelected(category: string, list: HTMLUListElement): boolean {
  return Array.from(list.children).some(
    (li) => li.firstChild?.textContent === category
  );
}

/**
 * Adds a category to the selected categories list.
 */
function addCategoryToList(category: string, list: HTMLUListElement) {
  const li = document.createElement('li');
  li.className =
    'list-group-item d-flex justify-content-between align-items-center';
  li.textContent = category;

  const removeButton = document.createElement('button');
  removeButton.className = 'btn btn-danger btn-sm';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    list.removeChild(li);
  });

  li.appendChild(removeButton);
  list.appendChild(li);
}

/**
 * Form submit handler.
 */
function attachFormSubmitHandler() {
  const businessForm = document.getElementById('businessForm');
  if (businessForm) {
    businessForm.addEventListener('submit', handleFormSubmit);
  } else {
    console.error('businessForm element not found');
  }
}

// Function to load the Mapbox Search script and initialize autofill
function loadMapboxSearch(): void {
  const script = document.createElement('script');
  script.src = 'https://api.mapbox.com/search-js/v1.0.0-beta.22/web.js';
  script.defer = true;
  script.onload = () => {
    // Mapbox Access Token
    const token = process.env.MAPBOX_ACCESS_TOKEN as string;
    // Initialize the autofill feature
    (
      window as {
        mapboxsearch?: { autofill: (options: { accessToken: string }) => void };
      }
    ).mapboxsearch?.autofill({
      accessToken: token,
    });
  };
  document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', () => {
  // Load Mapbox Search script for address autofill
  loadMapboxSearch();

  initCategoryAutocomplete();
  initCategorySelectionInput();
  attachFormSubmitHandler();
});
