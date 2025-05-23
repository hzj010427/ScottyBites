// This is the model for blobs

import { IBlob } from '../../common/blob.interface';
import { v4 as uuidV4 } from 'uuid';
import DAC from '../db/dac';
import { IAppError } from '../../common/server.responses';

export class Blob implements IBlob {
  _id: string;

  buf: Buffer;

  mimeType: string;

  constructor(buf: Buffer, mimeType: string) {
    this._id = uuidV4();
    this.buf = buf;
    this.mimeType = mimeType;
  }

  async save(): Promise<IBlob> {
    return await DAC.db.saveBlob(this);
  }

  static async getBlob(blobId: string): Promise<IBlob | null> {
    return await DAC.db.findBlobById(blobId);
  }

  static async updateBlob(blob: IBlob): Promise<IBlob> {
    return await DAC.db.updateBlob(blob);
  }

  static async deleteBlob(blobId: string): Promise<void> {
    return await DAC.db.deleteBlob(blobId);
  }
}
