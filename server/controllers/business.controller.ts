import Controller from './controller';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { IBusiness } from '../../common/business.interface';
import { Business } from '../models/business.model';
import { Blob } from '../models/blob.model';
import { IBlob } from '../../common/blob.interface';
import path from 'path';
import { authorize } from '../middlewares/authorize';
import BusinessUtils from '../utils/businessUtils';
import { IAppError, ISuccess } from '../../common/server.responses';
import { SearchDispatcher } from '../utils/SearchDispatcher';
import { SearchBusinesses } from '../searchStrategies/SearchBusinesses';

const upload = multer({ storage: multer.memoryStorage() });

/**
 * Business Controller
 */
export default class BusinessController extends Controller {
  private searchDispatcher: SearchDispatcher<IBusiness>;

  public constructor(path: string) {
    super(path);
    this.searchDispatcher = new SearchDispatcher<IBusiness>();
    const searchBusinesses = new SearchBusinesses();
    this.searchDispatcher.setSearchStrategy(searchBusinesses);
  }

  /**
   * Initialize routes for the Business Controller
   */
  public initializeRoutes(): void {
    /* Get Catalog Page */
    this.router.get('/pages/catalog', this.catalogPage);
    /* Get Creation Page */
    this.router.get('/pages/creation', this.creationPage);
    /* Get Business Page */
    this.router.get('/pages/:businessId', this.businessPage);
    this.router.use(authorize); // all routes below require authentication
    /* Get All Business profiles */
    this.router.get('/api/businesses', this.getAllBusiness.bind(this));
    /* Get a Business profile by ID */
    this.router.get('/api/businesses/:businessId', this.getBusinessInfo);
    /* Add Business */
    this.router.post(
      '/api/businesses',
      upload.single('picture'),
      this.addBusiness
    );
    /* Get a Business Picture */
    this.router.get(
      '/api/businesses/:businessId/picture',
      this.getBusinessPicture
    );
  }

  /**
   * Serve the catalog page
   */
  public async catalogPage(req: Request, res: Response) {
    res.sendFile(
      path.resolve('.dist', 'client', 'pages', 'businessCatalog.html')
    );
  }

  /**
   * Serve the business page
   */
  public async businessPage(req: Request, res: Response) {
    res.sendFile(
      path.resolve('.dist', 'client', 'pages', 'businessProfile.html')
    );
  }

  /**
   * Serve the creation page
   */
  public async creationPage(req: Request, res: Response) {
    res.sendFile(path.resolve('.dist', 'client', 'pages', 'addBusiness.html'));
  }

  /**
   * get all business profiles
   */
  public async getAllBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.q as string;
      // Query exist, search info
      if (query) {
        const query = req.query.q as string;
        if (!query) {
          return res.status(400).json({
            type: 'ClientError',
            name: 'SearchQueryMissing',
            message: 'Search query is required',
          });
        }

        const results: IBusiness[] = await this.searchDispatcher.search(query);
        res.status(200).json({
          name: 'SearchCompleted',
          message: 'Businesses search completed.',
          payload: results,
        } as ISuccess);
      } else {
        // No query, get all businesses
        const businesses: IBusiness[] = await Business.getBusinessAll();
        return res.status(200).json({
          name: 'BusinessesFound',
          message: 'Businesses found successfully',
          payload: {
            businesses: businesses,
            hasMore: false,
          }, // FIX: the response should align with ISuccess
        });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * get a business profile
   */
  public async getBusinessInfo(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const businessId: string = req.params.businessId;
      const business: IBusiness | null =
        await Business.getBusinessById(businessId);

      if (!business) {
        return res.status(404).json({
          type: 'ClientError',
          name: 'BusinessNotFound',
          message: 'Business not found',
        });
      }

      return res.status(200).json({
        name: 'BusinessFound',
        message: 'Business found successfully',
        payload: business,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Add a business profile
   */
  public async addBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, address, category, description, phone, email, website } =
        req.body;

      if (!name || !address || !category || !description) {
        return res.status(400).json({
          error:
            'Business name, address, category and description are required',
        });
      }

      // Ensure category is an array of strings
      const categoryArray = Array.isArray(category) ? category : [category];
      // clean and validate category information
      const cleanedCategory = BusinessUtils.cleanCategory(categoryArray);
      if (!req.file) {
        console.log('No file received');
        return res.status(404).json({
          type: 'ClientError',
          name: 'picture',
          message: 'No file received',
        });
      }
      // validate file format
      if (!BusinessUtils.validateFileFormat(req.file)) {
        console.log('Invalid file format');
        return res.status(404).json({
          type: 'ClientError',
          name: 'picture',
          message:
            'Image has to be smaller than 1MB with format jpeg, png, webp, or bmp',
        });
      }

      // validate location information
      const cleanAddress = await BusinessUtils.cleanLocation(address);

      const blob: Blob = new Blob(req.file.buffer, req.file.mimetype);

      const savedBlob: IBlob = await blob.save();

      const pictureId: string = savedBlob._id;

      const business: Business = new Business({
        name : name,
        address: cleanAddress,
        category: cleanedCategory,
        description: description,
        phone: phone || '',
        email: email || '',
        website: website || '',
        picture:pictureId
    });

      const savedBusiness: IBusiness = await business.saveBusiness();

      return res.status(201).json({
        name: 'BusinessAdded',
        message: `Business ${business.name} added successfully`,
        payload: savedBusiness,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getBusinessPicture(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const businessId: string = req.params.businessId;
      const business: IBusiness | null =
        await Business.getBusinessById(businessId);

      if (!business) {
        return res.status(404).json({
          type: 'ClientError',
          name: 'BusinessNotFound',
          message: 'Business not found',
        });
      }

      const pictureBlob: IBlob | null = await Blob.getBlob(business.picture);

      if (!pictureBlob) {
        // using default blob
        const defaultBlob: IBlob | null = await Blob.getBlob('default-avatar');
        if (!defaultBlob) {
          return res.status(404).json({
            type: 'ServerError',
            name: 'DefaultBlobNotFound',
            message: 'Default Blob not found',
          });
        }
        res.setHeader('Content-Type', defaultBlob.mimeType);
        res.send(Buffer.from(defaultBlob.buf));
        // console.log(Buffer.from(defaultBlob._id));
        return;
      }

      res.setHeader('Content-Type', pictureBlob.mimeType);
      res.send(Buffer.from(pictureBlob.buf));
      // console.log(Buffer.from(pictureBlob._id));
    } catch (err) {
      next(err);
    }
  }
}
