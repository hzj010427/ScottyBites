// Controller serving the blob storage

import Controller from './controller';
import { Request, Response, NextFunction } from 'express';
import { Blob } from '../models/blob.model';
import { IAppError } from '../../common/server.responses';

export default class BlobController extends Controller {
  public constructor(path: string) {
    super(path);
  }

  public initializeRoutes(): void {
    this.router.get('/:blobId', this.getBlob);
    this.router.post('/', this.validateBlobFormat, this.saveBlob);
    this.router.delete('/:blobId', this.deleteBlob);
  }

  public async getBlob(req: Request, res: Response, next: NextFunction) {
    try {
      const blobId: string = req.params.blobId;
      const blob = await Blob.getBlob(blobId);

      if (!blob) {
        return res.status(404).json({
          type: 'ClientError',
          name: 'BlobNotFound',
          message: 'Blob not found',
        } as IAppError);
      }

      res.setHeader('Content-Type', blob.mimeType);
      res.setHeader('Content-Length', blob.buf.length);
      res.send(blob.buf);
    } catch (err) {
      next(err);
    }
  }

  // Zach: We should implement the save and update in other controllers that can do authorization
  public async saveBlob(req: Request, res: Response, next: NextFunction) {
    if (!req.file) {
      return res.status(400).json({
        type: 'ClientError',
        name: 'NoFileUploaded',
        message: 'No file uploaded',
      } as IAppError);
    }

    try {
      const blob = new Blob(req.file.buffer, req.file.mimetype);
      await blob.save();

      res.status(201).json({
        name: 'BlobSaved',
        message: 'Blob saved successfully',
        payload: {
          blobId: blob._id,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async deleteBlob(req: Request, res: Response, next: NextFunction) {
    try {
      const blobId: string = req.params.blobId;
      await Blob.deleteBlob(blobId);

      res.status(200).json({
        name: 'BlobDeleted',
        message: 'Blob deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  private validateBlobFormat(req: Request, res: Response, next: NextFunction) {
    // Placeholder for validateBlobFormat
  }
}
