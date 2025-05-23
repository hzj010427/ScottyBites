import { Server } from 'http';
import App from '../../server/app';
import BusinessController from '../../server/controllers/business.controller';
import AuthController from '../../server/controllers/auth.controller';
import axios, { AxiosError } from 'axios';
import DAC from '../../server/db/dac';
import { InMemoryDB } from '../../server/db/inMemory.db';
import { IAuth } from '../../common/user.interface';
import path from 'path';
import { Business } from '../../server/models/business.model';
import { IBusiness } from '../../common/business.interface';
import FormData from 'form-data';
import BusinessUtils from '../../server/utils/businessUtils';
import { IJwtPayload } from '../../common/user.interface';
import { UserUtils } from '../../server/utils/userUtils';
import { stopWords } from '../../server/utils/searchUtils';

const HOST = 'http://localhost';
const dummyStaticPath = path.join(__dirname, '..');

let app: App;
let server: Server;

describe('Integration Tests: View and Add Business', () => {
  const PORT = 4020; // test port

  let token: string;
  let business1: Business;
  beforeAll(async () => {
    // Generate a signed token for the admin user
    const tokenPayload: IJwtPayload = {
      userId: 'admin',
      password: '$2b$10$7EoVzD0I3wKiSzfHjV1FsuCJXnfX67/BkUsL1M24pdTwQLTjMONQy',
    };
    token = UserUtils.generateToken(tokenPayload, 'never');
    // Initialize App with in-memory DB
    app = new App(
      [new BusinessController('/Business'), new AuthController('/auth')],
      {
        port: PORT,
        host: HOST,
        clientDir: dummyStaticPath,
        db: new InMemoryDB(), // in-memory DB for testing
        url: `${HOST}:${PORT}`,
        initOnStart: true,
      }
    );

    // Start the server
    server = await app.listen();

    // Prepopulate the in-memory DB with a business
    business1 = new Business({
      name: 'Carnegie Mellon University',
      address: await BusinessUtils.cleanLocation(
        '5000 Forbes Ave, Pittsburgh, PA 15213'
      ),
      category: ['test'],
      description: 'test description',
      phone: '123-456-7890',
      email: 'test@andrew.cmu.edu',
      website: 'test.com',
      picture: 'test.jpg'
  });
  });

  beforeEach(async () => {
    // Reset the in-memory DB before each test
    DAC.db.init();
  });

  afterEach(async () => {
    // Reset the in-memory DB after each test
    DAC.db.cleanUp();
  });

  afterAll(() => {
    server.close();
  });

  test(' in User Should get a business successfully', async () => {
    // prepopulate the in-memory DB with a business
    await DAC.db.saveBusiness(business1);
    const businessId = business1._id;
    // form and send a request to get a business
    const res = await axios.get(
      `${HOST}:${PORT}/business/api/businesses/${businessId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Send the token in the Authorization header
        },
      }
    );
    const businessBack = res.data.payload;
    // check the response
    expect(res.status).toBe(200);
    expect(businessBack).not.toBeNull();
    if (!businessBack) {
      return;
    }
    expect(businessBack).toEqual(business1);
  });

  test(' User Should add a business successfully', async () => {
    // no need to prepopulate the in-memory DB
    const businessToAdd = {
      name: 'Carnegie Mellon University',
      address: '5000 Forbes Ave, Pittsburgh, PA 15213',
      category: ['Chinese', 'American'],
      description: 'Top Computer Science School',
      phone: '123-456-7890',
    };

    const content = Buffer.from('test image');
    const uploadedFile = {
      mimetype: 'image/jpeg',
      filename: 'test.jpg',
      buffer: content,
      size: content.length,
    };

    // Create a FormData object
    const formData = new FormData();
    formData.append('name', businessToAdd.name);
    formData.append('address', businessToAdd.address);
    businessToAdd.category.forEach((item, index) => {
      formData.append(`category[${index}]`, item);
    });
    formData.append('description', businessToAdd.description);
    formData.append('phone', businessToAdd.phone);
    formData.append('picture', uploadedFile.buffer, {
      filename: uploadedFile.filename,
      contentType: uploadedFile.mimetype,
    });

    // form and send a request to add a business
    const res = await axios.post(
      `${HOST}:${PORT}/business/api/businesses/`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Send the token in the Authorization header
          ...formData.getHeaders(), // Include the multipart/form-data headers
        },
      }
    );
    const businessBack = res.data.payload;
    // check the response
    expect(res.status).toBe(201);

    // check the database
    const businessInDB = await DAC.db.findBusinessById(businessBack._id);
    expect(businessInDB).not.toBeNull();
    if (!businessInDB) {
      return;
    }
    expect(businessInDB.name).toBe(businessToAdd.name);
    expect(businessInDB.address).not.toBeNull();
    const cleanAddress = await BusinessUtils.cleanLocation(
      businessToAdd.address
    );
    expect(businessInDB.address).toBe(cleanAddress);
    expect(businessInDB.category).toEqual(businessToAdd.category);
    expect(businessInDB.description).toBe(businessToAdd.description);
    expect(businessInDB.phone).toBe(businessToAdd.phone);
    expect(businessInDB.picture).toBe(businessBack.picture);
  });

  test(' User Should NOT add a duplicated business', async () => {
    // prepopulate the in-memory DB with a business
    await DAC.db.saveBusiness(business1);

    const businessToAdd = {
      name: 'Carnegie Mellon University',
      address: '5000 Forbes Ave, Pittsburgh, PA 15213',
      category: ['Chinese', 'American'],
      description: 'Top Computer Science School',
      phone: '123-456-7890',
    };

    const content = Buffer.from('test image');
    const uploadedFile = {
      mimetype: 'image/jpeg',
      filename: 'test.jpg',
      buffer: content,
      size: content.length,
    };

    // Create a FormData object
    const formData = new FormData();
    formData.append('name', businessToAdd.name);
    formData.append('address', businessToAdd.address);
    businessToAdd.category.forEach((item, index) => {
      formData.append(`category[${index}]`, item);
    });
    formData.append('description', businessToAdd.description);
    formData.append('phone', businessToAdd.phone);
    formData.append('picture', uploadedFile.buffer, {
      filename: uploadedFile.filename,
      contentType: uploadedFile.mimetype,
    });

    try {
      // form and send a request to add a business
      const res = await axios.post(
        `${HOST}:${PORT}/business/api/businesses/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Send the token in the Authorization header
            ...formData.getHeaders(), // Include the multipart/form-data headers
          },
        }
      );
      fail('Expected request to fail but it succeeded');
    } catch (error) {
      const axiosError = error as AxiosError;
      expect(axios.isAxiosError(axiosError)).toBe(true); // Check it's an Axios error
      expect(axiosError.response?.status).toBe(400);
      expect(axiosError.response?.data).toEqual({
        type: 'ClientError',
        name: 'name',
        message: 'Business already exists',
      });
    }
  });

  test(' User Should NOT add a business with location outside of pittsburgh', async () => {
    // no need to prepopulate the in-memory DB
    const businessToAdd = {
      name: 'Columbia University',
      address: '116th and Broadway, New York, NY 10027',
      category: ['Chinese', 'American'],
      description: 'Top Computer Science School',
      phone: '123-456-7890',
    };

    const content = Buffer.from('test image');
    const uploadedFile = {
      mimetype: 'image/jpeg',
      filename: 'test.jpg',
      buffer: content,
      size: content.length,
    };

    // Create a FormData object
    const formData = new FormData();
    formData.append('name', businessToAdd.name);
    formData.append('address', businessToAdd.address);
    businessToAdd.category.forEach((item, index) => {
      formData.append(`category[${index}]`, item);
    });
    formData.append('description', businessToAdd.description);
    formData.append('phone', businessToAdd.phone);
    formData.append('picture', uploadedFile.buffer, {
      filename: uploadedFile.filename,
      contentType: uploadedFile.mimetype,
    });

    try {
      // form and send a request to add a business
      const res = await axios.post(
        `${HOST}:${PORT}/business/api/businesses/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Send the token in the Authorization header
            ...formData.getHeaders(), // Include the multipart/form-data headers
          },
        }
      );
      fail('Expected request to fail but it succeeded');
    } catch (error) {
      const axiosError = error as AxiosError;
      expect(axios.isAxiosError(axiosError)).toBe(true); // Check it's an Axios error
      expect(axiosError.response?.status).toBe(400);
      expect(axiosError.response?.data).toEqual({
        type: 'ClientError',
        name: 'address',
        message: 'Invalid address, address needs to be in Pittsburgh',
      });
    }
  });

  test(' User Should get all businesses successfully', async () => {
    // prepopulate the in-memory DB with a business

    await DAC.db.saveBusiness(business1);

    // form and send a request to get a business
    const res = await axios.get(`${HOST}:${PORT}/business/api/businesses/`, {
      headers: {
        Authorization: `Bearer ${token}`, // Send the token in the Authorization header
      },
    });
    const getAllBusinesses = res.data.payload.businesses;
    // check the response
    expect(res.status).toBe(200);
    expect(getAllBusinesses.length).toBe(1);
    const businessBack = getAllBusinesses[0];
    expect(businessBack).toEqual(business1);
  });

  test('User Should get a business picture successfully', async () => {
    // add a business
    const businessToAdd = {
      name: 'Carnegie Mellon University',
      address: '5000 Forbes Ave, Pittsburgh, PA 15213',
      category: ['Chinese', 'American'],
      description: 'Top Computer Science School',
      phone: '123-456-7890',
    };

    const content = Buffer.from('test image');
    const uploadedFile = {
      mimetype: 'image/jpeg',
      filename: 'test.jpg',
      buffer: content,
      size: content.length,
    };

    // Create a FormData object
    const formData = new FormData();
    formData.append('name', businessToAdd.name);
    formData.append('address', businessToAdd.address);
    businessToAdd.category.forEach((item, index) => {
      formData.append(`category[${index}]`, item);
    });
    formData.append('description', businessToAdd.description);
    formData.append('phone', businessToAdd.phone);
    formData.append('picture', uploadedFile.buffer, {
      filename: uploadedFile.filename,
      contentType: uploadedFile.mimetype,
    });

    //add a business
    const addRes = await axios.post(
      `${HOST}:${PORT}/business/api/businesses/`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Send the token in the Authorization header
          ...formData.getHeaders(), // Include the multipart/form-data headers
        },
      }
    );
    const businessBack = addRes.data.payload;

    // form and send a request to get a business
    const res = await axios.get(
      `${HOST}:${PORT}/business/api/businesses/${businessBack._id}/picture`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Send the token in the Authorization header
        },
        responseType: 'arraybuffer',
      }
    );
    // check the response
    expect(res.status).toBe(200);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(Buffer.from(res.data).equals(content)).toBe(true); // Compare the binary data
  });
});

describe('Integration Tests: Search Business', () => {
  const PORT = 8000;
  let server: Server;
  let token: string;
  let headers = {
    Authorization: '',
  };
  let newBusiness: IBusiness;

  beforeAll(async () => {
    const app = new App(
      [new BusinessController('/business'), new AuthController('/auth')],
      {
        port: PORT,
        host: HOST,
        clientDir: dummyStaticPath,
        db: new InMemoryDB(),
        url: `${HOST}:${PORT}`,
        initOnStart: true,
      }
    );

    server = await app.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    await DAC._db.cleanUp();
    await DAC._db.init();

    // Get the admin's token and set header
    const credentials: IAuth = {
      username: 'admin',
      password: 'admin',
    };
    const res = await axios.post(
      `${HOST}:${PORT}/auth/api/tokens`,
      credentials
    );
    token = res.data.payload.token;
    headers = {
      Authorization: `Bearer ${token}`,
    };

    // Create a business
    const business = new Business({
      name: 'Test Restaurant',
      address: '5000 Forbes Ave, Pittsburgh, PA 15213',
      category: ['Chinese', 'American'],
      description: 'Test description' + stopWords.join(' '),
      phone: '123-456-7890',
      email: 'test@example.com',
      website: 'test.com',
      picture: 'test.jpg'
    });
    newBusiness = await business.saveBusiness();

  });

  test('Should search for a business by name', async () => {
    const res = await axios.get(`${HOST}:${PORT}/business/api/businesses`, {
      params: { q: 'Test Restaurant' },
      headers,
    });
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('SearchCompleted');
    expect(res.data.payload).toHaveLength(1);
    expect(res.data.payload[0]).toEqual(newBusiness);
  });

  test('Should search for a business by category', async () => {
    const res = await axios.get(`${HOST}:${PORT}/business/api/businesses`, {
      params: { q: 'Chinese' },
      headers,
    });
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('SearchCompleted');
    expect(res.data.payload).toHaveLength(1);
    expect(res.data.payload[0]).toEqual(newBusiness);
  });

  test('Should search for a business by description', async () => {
    const res = await axios.get(`${HOST}:${PORT}/business/api/businesses`, {
      params: { q: 'Test description' },
      headers,
    });
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('SearchCompleted');
    expect(res.data.payload).toHaveLength(1);
    expect(res.data.payload[0]).toEqual(newBusiness);
  });

  test('Should not return results when searching only stop words', async () => {
    try {
      const res = await axios.get(`${HOST}:${PORT}/business/api/businesses`, {
        params: { q: stopWords.join(' ') },
        headers,
      });

      expect(res.status).toBe(200);
      expect(res.data.name).toBe('SearchCompleted');
      if (res.data.payload.length > 0) {
        fail('Search unexpectedly returned results for stop words');
      }
    } catch (error) {
      expect(error.message).toContain(
        'Search unexpectedly returned results for stop words'
      );
    }
  });
});
