import DAC from '../../../server/db/dac';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import { Business } from '../../../server/models/business.model';
import { IBusiness } from '../../../common/business.interface';
import { IAppError } from '../../../common/server.responses';
import Controller from '../../../server/controllers/controller';
import { Server as SocketServer } from 'socket.io';
import { stopWords } from '../../../server/utils/searchUtils';

describe('Business model tests', () => {
  let business: Business;
  beforeAll(() => {
    business = new Business({
      name: 'test business',
      address: '1234 test street',
      category: ['test'],
      description: 'test description',
      phone: '123-456-7890',
      email: 'test@andrew.cmu.edu',
      website: 'test.com',
      picture: 'test.jpg',
    });
  });

  beforeEach(async () => {
    DAC.db = new InMemoryDB();
    // await DAC.db.init();

    //Mock the server socket
    Controller.io = {
      emit: jest.fn(), // Mock the emit function
    } as unknown as SocketServer;
  });

  test('should successful get a exist business by its ID', async () => {
    // Prepopulate the in-memory DB with a valid business
    await DAC.db.saveBusiness(business);

    const businessInfo = await Business.getBusinessById(business._id);
    expect(businessInfo).not.toBeNull();
    if (!businessInfo) {
      fail('business not found');
    }
    expect(businessInfo).toEqual(business);
  });

  test('should not successful get a business with non-existing id', async () => {
    // Prepopulate the in-memory DB with a valid business
    await DAC.db.saveBusiness(business);

    const nonExistingBusinessId = 'non-existing-id';
    const businessInfo = await Business.getBusinessById(nonExistingBusinessId);
    expect(businessInfo).toBeNull();
  });

  test('should successful get all businesses', async () => {
    // Prepopulate the in-memory DB with a valid business
    await DAC.db.saveBusiness(business);
    const businesses = await Business.getBusinessAll();
    expect(businesses).not.toBeNull();
    expect(businesses.length).toBe(1);
    if (businesses.length !== 1) {
      fail('businesses list has wrong length');
    }
    expect(businesses[0]).toEqual(business);
  });

  test('Should successful save a unique business', async () => {
    const businessInfo = await business.saveBusiness();

    const businessInDb = await DAC.db.findBusinessById(businessInfo._id);
    expect(businessInDb).not.toBeNull();
    if (!businessInDb) {
      fail('business not found');
    }
    expect(businessInDb).toEqual(business);
  });

  test('Should not save a business that already exist (same name and address)', async () => {
    // Prepopulate the in-memory DB with a valid business
    await DAC.db.saveBusiness(business);

    const business2: Business = new Business({
      name: business.name,
      address: business.address,
      category: ['test 2'],
      description: 'test description 2',
      picture: business.picture,
    });
    try {
      await business2.saveBusiness();
      throw new Error('Expected save to fail with duplicated business');
    } catch (err: unknown) {
      expect((err as IAppError).message || err).toBe('Business already exists');
    }
  });

  test('Should not save a business with empty name', async () => {
    const businessWithEmptyName: Business = new Business({
      name: '', // Empty name
      address: business.address,
      category: business.category,
      description: business.description,
      picture: business.picture,
    });
    try {
      await businessWithEmptyName.saveBusiness();
      throw new Error('Expected save business to fail with empty name');
    } catch (err: unknown) {
      expect((err as IAppError).message || err).toBe('Invalid business name');
    }
  });

  test('Should not save a business with empty address', async () => {
    const businessWithEmptyAddress: Business = new Business({
      name: business.name, // Empty name
      address: '',
      category: business.category,
      description: business.description,
      picture: business.picture,
    });
    try {
      await businessWithEmptyAddress.saveBusiness();
      throw new Error('Expected save business to fail with empty address');
    } catch (err: unknown) {
      expect((err as IAppError).message || err).toBe(
        'Invalid address, address needs to be in Pittsburgh'
      );
    }
  });

  test('Should not save a business with empty description', async () => {
    const businessWithEmptyDescription: Business = new Business({
      name: business.name,
      address: business.address,
      category: business.category,
      description: '', // Empty description
      picture: business.picture,
    });
    try {
      await businessWithEmptyDescription.saveBusiness();
      throw new Error('Expected save business to fail with empty description');
    } catch (err: unknown) {
      expect((err as IAppError).message || err).toBe('Invalid description');
    }
  });

  test('Should not save a business with empty category', async () => {
    // Prepopulate the in-memory DB with a valid business
    const businessWithEmptyCategory: Business = new Business({
      name: business.name,
      address: business.address,
      category: [], // Empty category
      description: business.description,
      picture: business.picture,
    });
    try {
      await businessWithEmptyCategory.saveBusiness();
      throw new Error('Expected save business to fail with empty category');
    } catch (err: unknown) {
      expect((err as IAppError).message || err).toBe('Invalid category');
    }
  });

  test('Should successful update a business rating', async () => {
    // Prepopulate the in-memory DB with a valid business
    await DAC.db.saveBusiness(business);
    const firstRating = 3;
    const secondRating = 5;

    let updatedBusiness: IBusiness | null =
      await Business.addBusinessRatingById(business._id, firstRating);
    expect(updatedBusiness).not.toBeNull();
    updatedBusiness = await Business.addBusinessRatingById(
      business._id,
      secondRating
    );
    expect(updatedBusiness).not.toBeNull();
    const businessInDb = await DAC.db.findBusinessById(business._id);
    expect(businessInDb).not.toBeNull();
    if (!businessInDb) {
      fail('business not found');
    }
    const expectedNumReviews = 2;
    const expectedRating = (firstRating + secondRating) / expectedNumReviews;
    expect(businessInDb.numReviews).toEqual(expectedNumReviews);
    expect(businessInDb.rating).toEqual(expectedRating);
  });
});

describe('Search Business Unit Tests', () => {
  let business: Business;
  let business2: Business;
  beforeAll(async () => {
    DAC._db = new InMemoryDB();
    await DAC._db.init();
    business = new Business({
      name: 'Test Business',
      address: 'some address',
      category: ['category'],
      description: stopWords.join(' ') + 'description',
      phone: '123-456-7890',
      email: 'an email',
      website: 'website.com',
      picture: 'picture.png',
    });
    business2 = new Business({
      name: 'Another Business',
      address: 'another',
      category: ['anotherCat'],
      description: 'anotherDes',
      phone: '123-456-7891',
      email: 'another@email.com',
      website: 'another.com',
      picture: 'another.png',
    });
    await business.saveBusiness();
    await business2.saveBusiness();
  });

  test('Should search business by name', async () => {
    const result = await Business.search('Test');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(business);
  });

  test('Should fuzzy (partial) match', async () => {
    const result = await Business.search('Tes');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(business);
  });

  test('Should search business by category', async () => {
    const result = await Business.search('category');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(business);
  });

  test('Should search business by description', async () => {
    const result = await Business.search('description');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(business);
  });

  test('Should search multiple businesses by name', async () => {
    const result = await Business.search('Business');
    expect(result).toHaveLength(2);
    expect(result).toEqual([business, business2]);
  });

  test('Should search multiple businesses by category', async () => {
    const result = await Business.search('category anotherCat');
    expect(result).toHaveLength(2);
    expect(result).toEqual([business, business2]);
  });

  test('Should search multiple businesses by description', async () => {
    const result = await Business.search('des');
    expect(result).toHaveLength(2);
    expect(result).toEqual([business, business2]);
  });

  test('Should not search fields that are not searchable', async () => {
    const result = await Business.search('address website picture email 123');
    expect(result).toHaveLength(0);
  });

  test('Should drop stop words', async () => {
    const result = await Business.search(stopWords.join(' '));
    expect(result).toHaveLength(0);
  });
});
