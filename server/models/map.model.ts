import { ILocation, IMap } from "common/map.interface";
import { IAppError } from 'common/server.responses';
import DAC from '../db/dac';

export class ScottyBitesMap implements IMap {
  _id: string;
  location: ILocation;

  constructor(_id: string, location: ILocation) {
    this._id = _id;
    this.location = location;
  }

  static async getMapById(mapId: string): Promise<IMap | null> {
    try {
      return await DAC.db.findMapById(mapId);
    } catch (err) {
      throw {
        type: "ServerError",
        name: "FailedGetMapById",
        message: "Cannot get Map information",
      } as IAppError;
    }
  }

  static async getMapAll(): Promise<IMap[]> {
    try {
      return await DAC.db.findMapAll();
    } catch (err) {
      throw {
        type: "ServerError",
        name: "FailedGetMapAll",
        message: "Cannot get all Map information",
      } as IAppError;
    }
  }

  async saveMap(): Promise<IMap> {
    if (!this._id) {
      throw {
        type: "ServerError",
        name: "FailedSaveMap",
        message: "Cannot save Map information, no ID provided",
      } as IAppError;
    }

    if (!this.location || this.location.geometry == null || this.location.geometry.coordinates == null) {
      throw {
        type: "ServerError",
        name: "FailedSaveMap",
        message: "Cannot save Map information, incomplete or missing location",
      } as IAppError;
    }

    try {
      return await DAC.db.saveMap(this);
    } catch (err) {
      throw err as IAppError;
    }
  }
}