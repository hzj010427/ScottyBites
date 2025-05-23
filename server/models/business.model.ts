/**
 *
 */

import { IAppError } from 'common/server.responses';
import { IBusiness } from '../../common/business.interface';
import DAC from '../db/dac';
import { v4 as uuidV4 } from 'uuid';
import { BusinessUtils } from '../utils/businessUtils';
import { sanitizeText } from '../utils/sanitizeText';
import { dropStopWords } from '../utils/searchUtils';

export class Business implements IBusiness {
  _id: string;
  name: string;
  address: string;
  category: string[];
  description: string;
  phone?: string;
  email?: string;
  website?: string;
  picture: string;
  rating: number;
  numReviews: number;

  constructor({
    name,
    address,
    category,
    description,
    phone = '',
    email = '',
    website = '',
    picture,
  }: {
    name: string;
    address: string;
    category: string[];
    description: string;
    phone?: string;
    email?: string;
    website?: string;
    picture: string;
  }) {
    this._id = uuidV4();
    this.name = sanitizeText(name);
    this.address = sanitizeText(address);
    this.category = category.map((cat) => sanitizeText(cat));
    this.description = sanitizeText(description);
    this.phone = phone;
    this.email = email;
    this.website = website;
    this.picture = picture;
    this.rating = 0; // minimum rating is 1
    this.numReviews = 0;
  }

  static async getBusinessById(businessId: string): Promise<IBusiness | null> {
    try {
      return await DAC.db.findBusinessById(businessId);
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'FailedGetBusinessById',
        message: 'Cannot get Business information',
      } as IAppError;
    }
  }

  static async addBusinessRatingById(
    businessId: string,
    rating: number
  ): Promise<IBusiness | null> {
    return await DAC.db.addBusinessRatingById(businessId, rating);
  }

  static async getBusinessAll(): Promise<IBusiness[]> {
    try {
      return await DAC.db.findBusinessAll();
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'FailedGetBusinessAll',
        message: 'Cannot get Business information',
      } as IAppError;
    }
  }

  public static async search(query: string) {
    const sanitizedQuery = dropStopWords(sanitizeText(query));
    return await DAC.db.searchBusiness(sanitizedQuery);
  }

  async saveBusiness(): Promise<IBusiness> {
    // empty address
    if (!this.address) {
      throw {
        type: 'ClientError',
        name: 'address',
        message: 'Invalid address, address needs to be in Pittsburgh',
      };
    }
    // empty name
    if (!this.name) {
      throw {
        type: 'ClientError',
        name: 'name',
        message: 'Invalid business name',
      };
    }
    // empty category
    if (!this.category || this.category.length === 0) {
      throw {
        type: 'ClientError',
        name: 'category',
        message: 'Invalid category',
      };
    }
    // empty description
    if (!this.description) {
      throw {
        type: 'ClientError',
        name: 'description',
        message: 'Invalid description',
      };
    }
    // validiate unique business name and location
    const isDuplicate: boolean = await BusinessUtils.isDuplicateBusiness(
      this.name,
      this.address
    );

    if (isDuplicate) {
      throw {
        type: 'ClientError',
        name: 'name',
        message: 'Business already exists',
      };
    }

    try {
      return await DAC.db.saveBusiness(this);
    } catch (err) {
      throw {
        type: 'ServerError',
        name: 'FailedSaveBusiness',
        message: 'Cannot save Business information',
      } as IAppError;
    }
  }
}
