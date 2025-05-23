import { IBusiness } from '../../common/business.interface';
import { Business } from '../models/business.model';
import Controller from '../controllers/controller';
import DAC from '../db/dac';
import bcrypt from 'bcrypt';
import { IAppError } from '../../common/server.responses';
import {
  restaurantCategories,
  businessCategories,
} from '../../common/categories';
import axios from 'axios';

interface OpenStreetMapResult {
  lat: string;
  lon: string;
  display_name: string;
}

export class BusinessUtils {
  // max file size
  static readonly MAX_FILE_SIZE: number = 1000000;
  // Pittsburgh bounding box
  static readonly MIN_LAT = 40.3;
  static readonly MAX_LAT = 40.5;
  static readonly MIN_LON = -80.1;
  static readonly MAX_LON = -79.8;

  // Supported image types
  static readonly SUPPOTED_IMAGE_TYPE = [
    'image/png',
    'image/jpeg',
    'image/bmp',
    'image/webp',
  ];

  public static cleanCategory(category: string[]): string[] {
    const cleanedCategory: string[] = [];
    for (let i = 0; i < category.length; i++) {
      const cat = category[i].trim();
      if (
        restaurantCategories.includes(cat) ||
        businessCategories.includes(cat)
      ) {
        cleanedCategory.push(cat);
      }
    }
    return cleanedCategory;
  }

  public static validateFileFormat(file: Express.Multer.File): boolean {
    if (
      BusinessUtils.SUPPOTED_IMAGE_TYPE.includes(file.mimetype) &&
      file.size < BusinessUtils.MAX_FILE_SIZE
    ) {
      return true;
    }
    return false;
  }

  public static async isDuplicateBusiness(
    name: string,
    address: string
  ): Promise<boolean> {
    const businesses: IBusiness[] = await Business.getBusinessAll();
    for (let i = 0; i < businesses.length; i++) {
      if (
        businesses[i].name.toLowerCase() === name.toLowerCase() &&
        businesses[i].address.toLowerCase() === address.toLowerCase()
      ) {
        return true;
      }
    }
    return false;
  }

  public static async cleanLocation(location: string): Promise<string> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
    try {
      const { data } = await axios.get<OpenStreetMapResult[]>(url);

      if (data.length === 0) {
        return '';
      }

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);

      // Check if location is within Pittsburgh bounds
      if (
        lat < BusinessUtils.MIN_LAT ||
        lat > BusinessUtils.MAX_LAT ||
        lon < BusinessUtils.MIN_LON ||
        lon > BusinessUtils.MAX_LON
      ) {
        return '';
      }

      return location;
    } catch (error) {
      console.error('Error validating location:', error);
      return '';
    }
  }
}

export default BusinessUtils;
