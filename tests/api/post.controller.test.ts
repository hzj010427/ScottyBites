import { Server } from 'http';
import path from 'path';
import axios, { AxiosError } from 'axios';
import sharp from 'sharp';

import DAC from '../../server/db/dac';
import { InMemoryDB } from '../../server/db/inMemory.db';
import App from '../../server/app';
import PostController from '../../server/controllers/post.controller';
import AuthController from '../../server/controllers/auth.controller';
import { Post } from '../../server/models/post.model';
import { IPost } from '../../common/post.interface';
import { IJwtPayload } from '../../common/user.interface';
import { UserUtils } from '../../server/utils/userUtils';
import { IAuth } from '../../common/user.interface';
import { stopWords } from '../../server/utils/searchUtils';

const HOST = 'http://localhost';
const dummyStaticPath = path.join(__dirname, '..');

describe('Integration Tests: Post', () => {
  const PORT = 4666;
  let token: string;
  let server: Server;

  beforeAll(async () => {
    // Generate a signed token for the admin user
    const tokenPayload: IJwtPayload = {
      userId: 'admin',
      password: '$2b$10$7EoVzD0I3wKiSzfHjV1FsuCJXnfX67/BkUsL1M24pdTwQLTjMONQy',
    };
    token = UserUtils.generateToken(tokenPayload, 'never');

    const app = new App([new PostController('/post')], {
      port: PORT,
      host: HOST,
      clientDir: dummyStaticPath,
      db: new InMemoryDB(), // in-memory DB for testing
      url: `${HOST}:${PORT}`,
      initOnStart: true,
    });

    // Start the server
    server = await app.listen();
  });

  beforeEach(async () => {
    DAC.db.init();

    // Prepopulate the in-memory DB with 10 posts
    for (let i = 0; i < 10; i++) {
      const post = new Post({
        _id: `post${i}`,
        image_ids: [`image${i}`],
        owner_id: `test`,
        title: `Title ${i}`,
        biz_id: `biz${i}`,
      });

      await post.save();
    }
  });

  afterEach(async () => {
    DAC.db.cleanUp();
  });

  afterAll(() => {
    server.close();
  });

  test('should create a post without content', async () => {
    const post: IPost = {
      image_ids: ['image0'],
      owner_id: 'admin',
      title: 'Test Post',
      content: '',
      biz_id: 'biz0',
      biz_rating: 5,
    };

    // create the post
    const response1 = await axios.post(`${HOST}:${PORT}/post/api/posts`, post, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response1.status).toBe(201);
    expect(response1.data.message).toBe('Post created successfully');

    // send a get request to confirm the post was created
    const postId = response1.data.payload._id;
    const response2 = await axios.get(
      `${HOST}:${PORT}/post/api/posts/${postId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(response2.status).toBe(200);
    expect(response2.data.message).toBe('Post found successfully');
    const payload = response2.data.payload as IPost;
    expect(payload.title).toBe('Test Post');
    expect(payload.content).toBe('');
    expect(payload.biz_id).toBe('biz0');
    expect(payload.owner_id).toBe('admin');
    expect(payload.image_ids).toEqual(['image0']);
  });

  test('should create a post with content that less than 300 characters', async () => {
    const post: IPost = {
      image_ids: ['image0'],
      owner_id: 'admin',
      title: 'Test Post',
      content: 'This is a test post',
      biz_id: 'biz0',
      biz_rating: 5,
    };

    // create the post
    const response1 = await axios.post(`${HOST}:${PORT}/post/api/posts`, post, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response1.status).toBe(201);
    expect(response1.data.message).toBe('Post created successfully');

    // send a get request to confirm the post was created
    const postId = response1.data.payload._id;
    const response2 = await axios.get(
      `${HOST}:${PORT}/post/api/posts/${postId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(response2.status).toBe(200);
    expect(response2.data.message).toBe('Post found successfully');
    const payload = response2.data.payload as IPost;
    expect(payload.title).toBe('Test Post');
    expect(payload.content).toBe('This is a test post');
  });

  test('should not create a post with an image with invalid dimensions', async () => {
    const largeImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();
    const formData = new FormData();
    const largeImage = new Blob([largeImageBuffer], {
      type: 'image/png',
    });
    formData.append('image', largeImage, 'largeImage.png');

    try {
      await axios.post(`${HOST}:${PORT}/post/api/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      throw new Error(
        'Successfully uploaded an image with invalid dimensions, but should not happen'
      );
    } catch (error) {
      if (error instanceof AxiosError) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data.type).toBe('ClientError');
        expect(error.response?.data.name).toBe('InvalidImage');
        expect(error.response?.data.message).toBe(
          'Image dimensions must be between 150x150 and 650x650 pixels'
        );
      } else {
        throw error;
      }
    }
  });

  test('should not like a post twice', async () => {
    try {
      const response1 = await axios.patch(
        `${HOST}:${PORT}/post/api/posts/post1`,
        {
          like: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // first like should succeed
      expect(response1.status).toBe(200);
      expect(response1.data.name).toBe('PostUpdated');
      expect(response1.data.message).toBe('Post updated successfully');

      await axios.patch(
        `${HOST}:${PORT}/post/api/posts/post1`,
        {
          like: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // second like should fail
      throw new Error('Successfully liked a post twice, but should not happen');
    } catch (error) {
      if (error instanceof AxiosError) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data.type).toBe('ClientError');
        expect(error.response?.data.name).toBe('InvalidPostUpdate');
        expect(error.response?.data.message).toBe(
          'You have already liked this post'
        );
      } else {
        throw error;
      }
    }
  });

  test('should not unlike a post that is not liked', async () => {
    try {
      await axios.patch(
        `${HOST}:${PORT}/post/api/posts/post1`,
        {
          like: false,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // unlike a post that is not liked should fail
      throw new Error(
        'Successfully unliked a post that is not liked, but should not happen'
      );
    } catch (error) {
      if (error instanceof AxiosError) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data.type).toBe('ClientError');
        expect(error.response?.data.name).toBe('InvalidPostUpdate');
        expect(error.response?.data.message).toBe(
          'You cannot dislike a post that you have not liked'
        );
      } else {
        throw error;
      }
    }
  });

  test('should not delete a post that is not owned by the user', async () => {
    try {
      await axios.delete(`${HOST}:${PORT}/post/api/posts/post1`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // delete a post that is not owned by the user should fail
      throw new Error(
        'Successfully deleted a post that is not owned by the user, but should not happen'
      );
    } catch (error) {
      if (error instanceof AxiosError) {
        expect(error.response?.status).toBe(403);
        expect(error.response?.data.type).toBe('ClientError');
        expect(error.response?.data.name).toBe('ForbiddenRequest');
        expect(error.response?.data.message).toBe(
          'You are not allowed to delete this post'
        );
      } else {
        throw error;
      }
    }
  });

  test('should not comment on a post with more than 60 characters', async () => {
    const longComment =
      'This is a comment with more than 60 characterssssssssssssssssssssssssssssssssssssss';
    try {
      await axios.patch(
        `${HOST}:${PORT}/post/api/posts/post1`,
        {
          comment: longComment,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // comment on a post with more than 60 characters should fail
      throw new Error(
        'Successfully commented on a post with more than 60 characters, but should not happen'
      );
    } catch (error) {
      if (error instanceof AxiosError) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data.type).toBe('ClientError');
        expect(error.response?.data.name).toBe('InvalidComment');
        expect(error.response?.data.message).toBe(
          'Comment cannot be longer than 60 characters'
        );
      } else {
        throw error;
      }
    }
  });

  test('should not create a post without a title', async () => {
    const post: IPost = {
      image_ids: ['image0'],
      owner_id: 'admin',
      title: '',
      content: 'This is a test post',
      biz_id: 'biz0',
    };

    try {
      await axios.post(`${HOST}:${PORT}/post/api/posts`, post, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // create a post without a title should fail
      throw new Error(
        'Successfully created a post without a title, but should not happen'
      );
    } catch (error) {
      if (error instanceof AxiosError) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data.type).toBe('ClientError');
        expect(error.response?.data.name).toBe('MissingRequiredFields');
        expect(error.response?.data.message).toBe(
          'Missing required fields to create post'
        );
      } else {
        throw error;
      }
    }
  });
});

describe('Integration Tests: Search Post', () => {
  const PORT = 8000;
  let server: Server;
  let token: string;
  let headers = {
    Authorization: '',
  };

  beforeAll(async () => {
    const app = new App(
      [new PostController('/post'), new AuthController('/auth')],
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

    // Create a post
    const post = new Post({
      image_ids: ['image1.jpg'],
      owner_id: 'admin',
      title: 'Test Post',
      content: 'content' + stopWords.join(' '),
      biz_id: 'business_id',
    });
    await post.save();
  });

  test('Should search for a post by title', async () => {
    const res = await axios.get(`${HOST}:${PORT}/post/api/previews`, {
      params: { q: 'Test Post' },
      headers,
    });
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('SearchCompleted');
    expect(res.data.payload).toHaveLength(1);
    expect(res.data.payload[0]).toEqual({
      _id: expect.any(String),
      image_id: 'image1.jpg',
      owner_id: 'admin',
      title: 'Test Post',
      isLiked: expect.any(Boolean),
    });
  });

  test('Should search for a post by content', async () => {
    const res = await axios.get(`${HOST}:${PORT}/post/api/previews`, {
      params: { q: 'content' },
      headers,
    });
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('SearchCompleted');
    expect(res.data.payload).toHaveLength(1);
    expect(res.data.payload[0]).toEqual({
      _id: expect.any(String),
      image_id: 'image1.jpg',
      owner_id: 'admin',
      title: 'Test Post',
      isLiked: expect.any(Boolean),
    });
  });

  test('Should not return results when searching only stop words', async () => {
    try {
      const res = await axios.get(`${HOST}:${PORT}/post/api/previews`, {
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
