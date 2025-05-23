import { Server } from 'http';
import App from '../../server/app';
import AuthController from '../../server/controllers/auth.controller';
import MapController from '../../server/controllers/map.controller';
import axios, { AxiosError } from 'axios';
import DAC from '../../server/db/dac';
import { InMemoryDB } from '../../server/db/inMemory.db';
import { IAuth } from '../../common/user.interface';
import { User } from '../../server/models/user.model';
import path from 'path';
import { ILocation, IMap } from "../../common/map.interface";
import { ScottyBitesMap } from '../../server/models/map.model';
import nock from 'nock';

const HOST = 'http://localhost';
const dummyStaticPath = path.join(__dirname, '..');

let app: App;
let server: Server;

let token: string = ''; // Token for prepopulated user after login

const location1: ILocation = {
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [72.9426, 41.4428]
  },
  properties: {
    name: 'BAO',
    category: ['Chinese', 'Fast Food'],
    address: '400 South Craig Street',
  }
};

const location2: ILocation = {
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [73.9426, 42.4428]
  },
  properties: {
    name: 'KFC',
    category: ['American', 'Fast Food'],
    address: '500 South Craig Street',
  }
};

// New business details for testing (to be added)
const newBusinessName = 'Rosetea';
const newBusinessAddress = '414 South Craig Street';
const newBusinessCategory = ['Chinese', 'Drink'];
const newBusinessId = 'newId';

// Expected coordinates for the new business (mocked)
const expectedCoordinates: [number, number] = [-79.9426, 40.4428];

// Expected location object for the new business
const expectedLocation: ILocation = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: expectedCoordinates,
  },
  properties: {
    name: newBusinessName,
    category: newBusinessCategory,
    address: newBusinessAddress,
  },
};

// Expected map object for the new business
const expectedMap: IMap = {
  _id: newBusinessId,
  location: expectedLocation,
};

// Mock the Mapbox Geocoding API
const mockMapboxGeocoding = (address: string, valid = true) => {
  const encoded = encodeURIComponent(`${address}, Pittsburgh, PA`);
  const urlPath = `/geocoding/v5/mapbox.places/${encoded}.json`;

  nock('https://api.mapbox.com')
    .get(urlPath)
    .query(true) // match any query parameters (e.g., access_token)
    .reply(200, valid
      ? {
          type: 'FeatureCollection',
          features: [{
            center: expectedCoordinates,
          }],
        }
      : {
          type: 'FeatureCollection',
          features: [], // triggers the 404 behavior
        }
    );
};

describe('Integration Tests: Map', () => {
  const PORT = 4080; // test port
  
  beforeAll(async () => {
    // Initialize App with in-memory DB
    app = new App(
      [
        new AuthController('/auth'),
        new MapController('/map')
      ],
      {
        port: PORT,
        host: HOST,
        clientDir: dummyStaticPath,
        db: new InMemoryDB(), // in-memory DB for testing
        url: `${HOST}:${PORT}`,
        initOnStart: true,
      }
    );
  
    // Start the server
    server = await app.listen();
  });
  
  beforeEach(async () => {
    // Reset the in-memory DB before each test
    DAC.db.cleanUp();
  
    // Prepopulate the in-memory DB with a valid user
    const credentials: IAuth = {
      username: 'chris',
      email: 'minghuay@andrew.cmu.edu',
      password: 'pwd123',
    };
    const user: User = new User(credentials);
    await user.join();
    await User.acknowledgeUser('chris'); // agree to terms
  
    // Log in the user
    const authInfo: IAuth = {
      email: '',
      username: 'chris',
      password: 'pwd123',
    };
    const { data } = await axios.post(`${HOST}:${PORT}/auth/api/tokens`, authInfo);
    token = data.payload.token;
  
    // Prepopulate the in-memory DB with valid business locations
    const map1 = new ScottyBitesMap('map1', location1);
    const map2 = new ScottyBitesMap('map2', location2);
    await map1.saveMap();
    await map2.saveMap();
  });
  
  afterEach(() => {
    // clear all nock interceptors after each test
    nock.cleanAll();
  });
  
  afterAll(() => {
    server.close();
  });

  describe('Test Add Location api: /map/api/locations', () => {
    test('Add a valid business location', async () => {
      mockMapboxGeocoding(newBusinessAddress); // Stub the Mapbox API
  
      const res = await axios.post(`${HOST}:${PORT}/map/api/locations`, {
        _id: newBusinessId,
        name: newBusinessName,
        address: newBusinessAddress,
        category: newBusinessCategory,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      const { data } = res;
      const savedMap: IMap = data.payload;
  
      expect(res.status).toBe(201);
      expect(data.name).toBe('MapAdded');
      expect(data.message).toBe(`BusinessMap ${newBusinessName} added successfully`);
      expect(savedMap).toEqual(expectedMap);
  
      // Ensure db is updated
      const mapInDB = await DAC.db.findMapById(newBusinessId);
      expect(mapInDB).not.toBeNull();
      expect(mapInDB).toEqual(expectedMap);
    });
  
    test('Should fail if address is missing', async () => {
      mockMapboxGeocoding('', false); // Stub the Mapbox API

      try {
        const res = await axios.post(`${HOST}:${PORT}/map/api/locations`, {
          _id: '123',
          name: newBusinessName,
          address: '', // Missing address
          category: newBusinessCategory,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fail('Expected request to fail with status 400 but it succeeded');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axios.isAxiosError(axiosError)).toBe(true); // Check it's an Axios error
        expect(axiosError.response?.status).toBe(400);
        // Check the error message
        const errorData = axiosError.response?.data as { error: string };
        expect(errorData?.error).toMatch('Business id, name, and address are required');
      }
    });

    test('Should fail if address is not Geocodable', async () => {
      const invalidAddress = 'Invalid Address';
      mockMapboxGeocoding(invalidAddress, false); // Stub the Mapbox API

      try {
        const res = await axios.post(`${HOST}:${PORT}/map/api/locations`, {
          _id: newBusinessId,
          name: newBusinessName,
          address: invalidAddress,
          category: newBusinessCategory,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fail('Expected request to fail with status 404 but it succeeded');
      }
      catch (error) {
        const axiosError = error as AxiosError;
        expect(axios.isAxiosError(axiosError)).toBe(true); // Check it's an Axios error
        expect(axiosError.response?.status).toBe(404);
        // Check the error message
        const errorData = axiosError.response?.data as { error: string };
        expect(errorData?.error).toMatch('Business address not found on map or could not be geocoded');
      }
    });
  });

  describe('Test Get Location api: /map/api/maps', () => {
    test('Get all locations', async () => {
      const res = await axios.post(`${HOST}:${PORT}/map/api/maps`, {
        businessIds: [], // Empty array indicates getting all locations
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      const { data } = res;
      const targetMaps: IMap[] = data.payload;
  
      expect(res.status).toBe(200);
      expect(data.name).toBe('MapsFound');
      expect(data.message).toBe('BusinessMap found successfully');
      expect(targetMaps.length).toBe(2); // Two prepopulated locations
  
      // Check if the returned maps match the original maps
      expect(targetMaps[0]._id).toBe('map1');
      expect(targetMaps[0].location).toEqual(location1);
      expect(targetMaps[1]._id).toBe('map2');
      expect(targetMaps[1].location).toEqual(location2);
    });
  
    test('Get specific locations (more than one) by IDs', async () => {
      const res = await axios.post(`${HOST}:${PORT}/map/api/maps`, {
        businessIds: ['map1', 'map2'],
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      const { data } = res;
      const targetMaps: IMap[] = data.payload;
  
      expect(res.status).toBe(200);
      expect(data.name).toBe('MapsFound');
      expect(data.message).toBe('BusinessMap found successfully');
      expect(targetMaps.length).toBe(2); // Two prepopulated locations
  
      // Check if the returned maps match the original maps
      expect(targetMaps[0]._id).toBe('map1');
      expect(targetMaps[0].location).toEqual(location1);
      expect(targetMaps[1]._id).toBe('map2');
      expect(targetMaps[1].location).toEqual(location2);
    });

    test('Get specific locations (one) by ID', async () => {
      const res = await axios.post(`${HOST}:${PORT}/map/api/maps`, {
        businessIds: ['map1'],
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      const { data } = res;
      const targetMaps: IMap[] = data.payload;
  
      expect(res.status).toBe(200);
      expect(data.name).toBe('MapsFound');
      expect(data.message).toBe('BusinessMap found successfully');
      expect(targetMaps.length).toBe(1); // One location
  
      // Check if the returned map matches the original map
      expect(targetMaps[0]._id).toBe('map1');
      expect(targetMaps[0].location).toEqual(location1);
    });

    test('Get with non-existing ID', async () => {
      const res = await axios.post(`${HOST}:${PORT}/map/api/maps`, {
        businessIds: ['nonExistingId'],
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      const { data } = res;
      const targetMaps: IMap[] = data.payload;
  
      expect(res.status).toBe(200);
      expect(data.name).toBe('MapsFound');
      expect(data.message).toBe('BusinessMap found successfully');
      expect(targetMaps[0]).toBeNull(); // No location found
    });
  });
});
