import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDirections from '@mapbox/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import dotenv from 'dotenv';
import axios from 'axios';
import { ILocation, IMap } from '../../common/map.interface';

dotenv.config();

const token = localStorage.getItem('token');

const MAPBOX_ACCESS_TOKEN: string = process.env.MAPBOX_ACCESS_TOKEN ?? 'unknown';

// Create a bounds object to fit all location points
const bounds = new mapboxgl.LngLatBounds();
// Flag to check if user location has been added
let userLocationAdded = false;

// Array of Business Locations
let locationData: ILocation[] = [];

// Function to add restaurants from GeoJSON to the map
function addRestaurantsToMap(map: mapboxgl.Map, geojsonData: GeoJSON.FeatureCollection): void {
  // Create an SVG data URL from SVG code (location icon)
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#c41230" class="bi bi-geo-alt-fill" viewBox="0 0 16 16">
    <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/>
  </svg>`;
  
  // Convert SVG to a data URL
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  
  // Create an image object to load the SVG
  const img = new Image();
  img.onload = () => {
    // Once the image is loaded, add it to the map
    map.addImage('restaurant-icon', img);
    
    // Add the GeoJSON source to the map
    map.addSource('restaurants', {
      type: 'geojson',
      data: geojsonData
    });

    // Add a layer with the custom SVG icon
    map.addLayer({
      id: 'restaurants-layer',
      type: 'symbol',
      source: 'restaurants',
      layout: {
        'icon-image': 'restaurant-icon',
        'icon-allow-overlap': true
      },
      paint: {
        'icon-color': '#c41230'
      }
    });

    // Add a layer for restaurant names with Poppins font
    map.addLayer({
      id: 'restaurant-labels',
      type: 'symbol',
      source: 'restaurants',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Poppins Regular', 'Arial Unicode MS Regular'],
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-size': 12
      },
      paint: {
        'text-color': '#c41230',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1
      }
    });
    
    // Set up the popup functionality as before
    setupPopups(map);
  };
  
  // Set the source of the image to the SVG data URL
  img.src = svgDataUrl;
}

// Function to set up popups for the restaurants
function setupPopups(map: mapboxgl.Map): void {
  // Create a popup but don't add it to the map yet
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  // Show popup on mouseenter
  map.on('mouseenter', 'restaurants-layer', (e) => {
    if (!e.features || e.features.length === 0) return;
    
    map.getCanvas().style.cursor = 'pointer';
    
    const coordinates = (e.features[0].geometry.type === 'Point' && e.features[0].geometry.coordinates) 
      ? e.features[0].geometry.coordinates.slice() 
      : [];
    const properties = e.features[0].properties;

    let categoryList: string;
    try {
      const rawCategory = properties?.category;
      const parsedCategory = JSON.parse(rawCategory);

      categoryList = Array.isArray(parsedCategory)
        ? parsedCategory.join(', ')
        : rawCategory;
    } catch {
      categoryList = properties?.category || 'Restaurant';
    }
    
    // Create popup content using properties
    const popupContent = `
      <div class="map-popup-content">
        <p class="popup-name">${properties?.name}</p>
        <p class="popup-category">${categoryList}</p>
        ${properties?.address ? `<p class="popup-address">${properties.address}</p>` : ''}
      </div>
    `;

    // Position the popup and set its content
    popup
      .setLngLat(coordinates as [number, number])
      .setHTML(popupContent)
      .addTo(map);
  });

  // Remove popup on mouseleave
  map.on('mouseleave', 'restaurants-layer', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
}

// Initialize map instance and centered on CMU campus
function createMapInstance(): mapboxgl.Map {
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  return new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-79.94237, 40.44350], // CMU campus
    zoom: 17
  });
}

// Fetch and process location data
async function fetchLocationData(): Promise<ILocation[]> {
  const businessIds: string[] = JSON.parse(sessionStorage.getItem('businessIds') || '[]');
  
  try {
    const response = await axios.post('/map/api/maps', {
      businessIds: businessIds
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.payload.map((map: IMap) => map.location);
  } catch (error) {
    console.error('Error fetching map data:', error);
    return [];
  }
}

// Add map controls
function addMapControls(map: mapboxgl.Map): { geolocateControl: mapboxgl.GeolocateControl } {
  const nav = new mapboxgl.NavigationControl();
  map.addControl(nav, 'bottom-right');

  const directions = new MapboxDirections({
    accessToken: mapboxgl.accessToken
  });
  map.addControl(directions, 'top-right');

  const geolocateControl = new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true,
    showUserLocation: true
  });
  map.addControl(geolocateControl, 'bottom-left');

  return { geolocateControl };
}

// Setup geolocation tracking
function setupGeolocationTracking(
  map: mapboxgl.Map, 
  geolocateControl: mapboxgl.GeolocateControl, 
  bounds: mapboxgl.LngLatBounds
): void {
  geolocateControl.on('geolocate', (e) => {
    if (!userLocationAdded) {
      bounds.extend([e.coords.longitude, e.coords.latitude]);
      userLocationAdded = true;
    }
    
    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 17
    });
  });

  geolocateControl.on('trackuserlocationend', () => {
    if (userLocationAdded) {
      userLocationAdded = false;
      bounds = new mapboxgl.LngLatBounds();
      if (locationData.length > 0) {
        locationData.forEach(location => {
          bounds.extend(location.geometry.coordinates);
        });
        
        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 17
        });
      }
    }
  });
}

// Update map bounds based on location data
function updateMapBounds(map: mapboxgl.Map, locations: ILocation[]): void {
  if (locations.length > 0) {
    locations.forEach(location => {
      bounds.extend(location.geometry.coordinates);
    });
    
    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 17
    });
  }
}

// Initialize the map
function initializeMap(): void {
  const map = createMapInstance();

  map.on('load', async () => {
    locationData = await fetchLocationData();
    updateMapBounds(map, locationData);

    const restaurantsGeoJSON: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: locationData
    };
    addRestaurantsToMap(map, restaurantsGeoJSON);
  });

  console.log('Map initialized');

  const { geolocateControl } = addMapControls(map);
  setupGeolocationTracking(map, geolocateControl, bounds);
}

// Call the function when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  initializeMap();
});
