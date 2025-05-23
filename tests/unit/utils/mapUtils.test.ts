import { getCoordinatesFromAddress } from '../../../server/utils/mapUtils';
import nock from 'nock';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://api.mapbox.com';

// Skip this test in CI to avoid hitting the real API
describe.skip('Mapbox integration test (real API call)', () => {
  test('should return coordinates for a real address', async () => {
    const MAPBOX_ACCESS_TOKEN: string = process.env.MAPBOX_ACCESS_TOKEN ?? 'unknown';
    const [lng, lat] = await getCoordinatesFromAddress('5000 Forbes Ave', 'Pittsburgh, PA', MAPBOX_ACCESS_TOKEN);
    console.log('Live coordinates:', lng, lat);

    expect(typeof lng).toBe('number');
    expect(typeof lat).toBe('number');
    expect(lng).toBeLessThan(0); // Western Hemisphere
    expect(lat).toBeGreaterThan(30); // US range
  });
});

describe('getCoordinatesFromAddress (mocked with nock)', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  test('should return coordinates for a valid address (mocked)', async () => {
    const address = '5000 Forbes Ave';
    const city = 'Pittsburgh, PA';
    const token = 'dummy-token';
    const encoded = encodeURIComponent(`${address}, ${city}`);

    nock(BASE_URL)
      .get(`/geocoding/v5/mapbox.places/${encoded}.json`)
      .query({ access_token: token })
      .reply(200, {
        features: [
          { center: [-79.945, 40.443] }
        ]
      });

    const coords = await getCoordinatesFromAddress(address, city, token);
    expect(coords).toEqual([-79.945, 40.443]);
  });

  test('should throw an error if no coordinates are found (mocked)', async () => {
    const address = 'unknown';
    const city = 'Nowhere';
    const token = 'dummy-token';
    const encoded = encodeURIComponent(`${address}, ${city}`);

    nock(BASE_URL)
      .get(`/geocoding/v5/mapbox.places/${encoded}.json`)
      .query({ access_token: token })
      .reply(200, {
        features: []
      });

    await expect(getCoordinatesFromAddress(address, city, token))
      .rejects
      .toThrow('Address could not be geocoded.');
  });
});
