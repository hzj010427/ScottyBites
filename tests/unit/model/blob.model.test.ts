import DAC from '../../../server/db/dac';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import { Blob } from '../../../server/models/blob.model';
import { IBlob } from '../../../common/blob.interface';
import { IAppError } from '../../../common/server.responses';
import Controller from '../../../server/controllers/controller';
import { Server as SocketServer } from 'socket.io';

describe('Blob model tests', () => {
  let blob: Blob;
  beforeAll(() => {
    const mockBuffer = Buffer.from('test data');
    const mockMimeType = 'image/png';
    blob = new Blob(mockBuffer, mockMimeType);

  });

  beforeEach(() => {
    DAC.db = new InMemoryDB();
    // await DAC.db.init();
  });

  test('should successful save a blob', async () => {
    const savedBlob = await blob.save();
    const blobInDb = await DAC.db.findBlobById(savedBlob._id);
    expect(blobInDb).not.toBeNull();
    expect(Buffer.from(blobInDb!.buf)).toEqual(blob.buf); // Convert Uint8Array back to Buffer
    expect(blobInDb!.mimeType).toEqual(blob.mimeType);
  });

  test('should successful get a blob by id', async () => {
    const savedBlob = await blob.save();
    const blobInDb = await Blob.getBlob(savedBlob._id);
    expect(blobInDb).not.toBeNull();
    expect(Buffer.from(blobInDb!.buf)).toEqual(blob.buf); // Convert Uint8Array back to Buffer
    expect(blobInDb!.mimeType).toEqual(blob.mimeType);
  });
});
