// Controller serving the restaurant location data on map

import Controller from './controller';
import { NextFunction, Request, Response } from 'express';
import path from 'path';
import { MAPBOX_ACCESS_TOKEN } from '../env';
import { ILocation, IMap } from 'common/map.interface';
import { ScottyBitesMap } from '../models/map.model';
import { authorize } from '../middlewares/authorize';
import { getCoordinatesFromAddress } from '../utils/mapUtils';

export default class MapController extends Controller {
  public constructor(path: string) {
    super(path);
  }

  public initializeRoutes(): void {
    this.router.get('/pages/access', this.mapPage);
    this.router.use(authorize); // all routes below require token authentication
    this.router.post('/api/locations', this.addLocation); // add a new location
    this.router.post('/api/maps', this.getLocations); // get all locations (use post method for large payloads)
  }

  public async mapPage(req: Request, res: Response) {
    res.sendFile(path.resolve('.dist', 'client', 'pages', 'map.html'));
  }

  // Add a new location to the map db
  public async addLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { _id, name, address, category } = req.body;
      
      if (!_id || !name || !address) {
        return res.status(400).json({ error: 'Business id, name, and address are required' });
      }
      
      let longitude: number, latitude: number;
      try {
        [longitude, latitude] = await getCoordinatesFromAddress(address, 'Pittsburgh, PA', MAPBOX_ACCESS_TOKEN);
      } catch (error) {
        return res.status(404).json({ error: 'Business address not found on map or could not be geocoded' });
      }
      
      // Create GeoJSON feature for the restaurant
      const restaurantLocation: ILocation = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        properties: {
          name: name,
          category: category || [],
          address: address
        },
      };
      
      // Save restaurant location into db
      const map = new ScottyBitesMap(_id, restaurantLocation);
      const savedMap: IMap = await map.saveMap();
      
      // Return success response with the created map
      return res.status(201).json({
        name: 'MapAdded',
        message: `BusinessMap ${name} added successfully`,
        payload: savedMap,
      });
    } catch (err) {
      next(err);
    }
  }

  // Get all locations or specific locations based on map IDs
  public async getLocations(req: Request, res: Response, next: NextFunction) {
    try {
      let targetMaps: IMap[] = [];

      const { businessIds } = req.body;
      if (!businessIds || businessIds.length === 0) {
        // If no map IDs are provided, return all locations
        targetMaps = await ScottyBitesMap.getMapAll();
      } else {
        // If map IDs are provided, return only those locations
        const mapPromises = businessIds.map((mapId: string) => ScottyBitesMap.getMapById(mapId));
        targetMaps = await Promise.all(mapPromises);
      }

      return res.status(200).json({
        name: 'MapsFound',
        message: 'BusinessMap found successfully',
        payload: targetMaps,
      });
    } catch (err) {
      next(err);
    }
  }
}
