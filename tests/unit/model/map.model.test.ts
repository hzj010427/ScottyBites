import DAC from '../../../server/db/dac';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import { ILocation, IMap } from "../../../common/map.interface";
import { ScottyBitesMap } from '../../../server/models/map.model';

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

const newLocation: ILocation = {
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [79.9426, 40.4428]
  },
  properties: {
    name: 'Rosetea',
    category: ['Chinese', 'Drink'],
    address: '414 South Craig Street',
  }
};

describe('ScottyBitesMap Tests (mapModel)', () => {
  beforeEach(async () => {
    DAC.db = new InMemoryDB();

    // Prepare the database
    const map1 = new ScottyBitesMap('map1', location1);
    const map2 = new ScottyBitesMap('map2', location2);
    await map1.saveMap();
    await map2.saveMap();
  });

  describe('saveMap', () => {
    test('save a valid map', async () => {
      // Save a valid map
      const validMap = new ScottyBitesMap('map3', newLocation);
      const savedMap: IMap = await validMap.saveMap();
      // Check if the saved map matches the original map
      expect(savedMap).toEqual(validMap);
        
      // Find the map in DB
      const foundMap = await DAC.db.findMapById('map3');
      expect(foundMap).not.toBeNull();
      // Check if the found map matches the original map
      expect(foundMap).toEqual(validMap);
    });

    test('should throw an error if map ID is not provided', async () => {
      // Create a map without an ID
      const invalidMap = new ScottyBitesMap('', newLocation);
      try {
        await invalidMap.saveMap();
        fail('Should throw an error since map ID is not provided, but it did not');
      } catch (err) {
        expect(err).toEqual({
          type: 'ServerError',
          name: 'FailedSaveMap',
          message: 'Cannot save Map information, no ID provided',
        });
      }
    });

    test('should throw an error if location is not provided', async () => {
      // Create a map without location
      const invalidMap = new ScottyBitesMap('map3', {} as ILocation);
      try {
        await invalidMap.saveMap();
        fail('Should throw an error since location is not provided, but it did not');
      } catch (err) {
        expect(err).toEqual({
          type: 'ServerError',
          name: 'FailedSaveMap',
          message: 'Cannot save Map information, incomplete or missing location',
        });
      }
    });

    test('should throw an error if map already exists', async () => {
      // Create a map with an existing ID
      const existingMap = new ScottyBitesMap('map1', newLocation);
      try {
        await existingMap.saveMap();
        fail('Should throw an error since map already exists, but it did not');
      } catch (err) {
        expect(err).toEqual({
          type: 'ClientError',
          name: 'MapExists',
          message: 'Map already exists',
        });
      }
    });
  });

  describe('getMapById', () => {
    test('should return a map by valid ID', async () => {
      const mapId = 'map1';
      const foundMap = await ScottyBitesMap.getMapById(mapId);
      expect(foundMap).not.toBeNull();
      expect(foundMap?.location).toEqual(location1);
    });

    test('should return null for a non-existing map ID', async () => {
      const mapId = 'nonExistingMapId';
      const foundMap = await ScottyBitesMap.getMapById(mapId);
      expect(foundMap).toBeNull();
    });
  });

  describe('getMapAll', () => {
    test('should return all maps', async () => {
      const allMaps = await ScottyBitesMap.getMapAll();
      expect(allMaps.length).toBe(2);

      // Convert to set of stringified locations for comparison
      const receivedLocations = new Set(allMaps.map(m => JSON.stringify(m.location)));
      const expectedLocations = new Set([
        JSON.stringify(location1),
        JSON.stringify(location2),
      ]);
      expect(receivedLocations).toEqual(expectedLocations);
    });
  });
});
