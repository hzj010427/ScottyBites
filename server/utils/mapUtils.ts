import axios from 'axios';

export async function getCoordinatesFromAddress(address: string, city = 'Pittsburgh, PA', accessToken: string): Promise<[number, number]> {
  const encodedAddress = encodeURIComponent(`${address}, ${city}`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${accessToken}`;

  const response = await axios.get(url);

  if (!response.data.features || response.data.features.length === 0) {
    throw new Error('Address could not be geocoded.');
  }

  return response.data.features[0].center;
}
