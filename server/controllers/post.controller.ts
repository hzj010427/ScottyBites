import path from 'path';
import multer from 'multer';

import Controller from './controller';
import {
  IPost,
  IComment,
  IPostPreview,
  ILike,
  IPostUpdate,
} from '../../common/post.interface';
import { IBlob } from '../../common/blob.interface';
import { Post, Comment, Like } from '../models/post.model';
import { Blob } from '../models/blob.model';
import { Request, Response, NextFunction } from 'express';
import { authorize } from '../middlewares/authorize';
import { IAppError, ISuccess } from '../../common/server.responses';
import { PostUtils } from '../utils/postUtils';
import { Business } from '../models/business.model';
import { ImageValidator } from '../utils/validateImage';
import { Profile } from '../models/profile.model';
import { SearchDispatcher } from '../utils/SearchDispatcher';
import { SearchPosts } from '../searchStrategies/SearchPosts';

const storage = multer.memoryStorage();
const upload = multer({ storage });

export default class PostController extends Controller {
  private searchDispatcher: SearchDispatcher<IPost>;

  public constructor(path: string) {
    super(path);
    this.searchDispatcher = new SearchDispatcher<IPost>();
    const searchPosts = new SearchPosts();
    this.searchDispatcher.setSearchStrategy(searchPosts);
  }

  public initializeRoutes(): void {
    this.router.get('/pages/feed', this.getPostFeed);
    this.router.get('/pages/create', this.getPostCreate);
    this.router.get('/pages/full/:postId', this.getPostFull);

    this.router.use(authorize);
    this.router.get('/api/unviewed-previews', this.getUnviewedPostPreviews);
    this.router.get('/api/previews', this.getAllPostPreviews.bind(this));
    this.router.get('/api/previews/:userId', this.getPostPreviewsByUser);
    this.router.get('/api/liked-previews', this.getLikedPostPreviews);
    this.router.get('/api/posts/:postId', this.getPost);
    this.router.get(
      '/api/posts/:postId/comments',
      this.validatePostExists,
      this.getPostComments
    );

    this.router.post(
      '/api/posts',
      this.validateRequiredFields,
      this.validateTitleFormat,
      this.validateContentFormat,
      this.validateBizRating,
      this.createPost
    );

    this.router.patch(
      '/api/posts/:postId',
      this.validatePostExists,
      this.validateEmptyUpdate,
      this.validateCommentFormat,
      this.validateLikeIdempotency,
      this.updatePost
    );

    this.router.delete(
      '/api/posts/:postId',
      this.validatePostExists,
      this.validateDeletePermission,
      this.deletePost
    );

    this.router.post(
      '/api/images',
      upload.single('image'),
      this.validateImageFormat,
      this.saveImage
    );

    this.router.delete(
      '/api/images/:imageId',
      this.validateImageExists,
      this.deleteImage
    );
  }

  public async getPostFull(req: Request, res: Response, next: NextFunction) {
    res.sendFile(path.resolve('.dist', 'client', 'pages', 'post.html'));
  }

  public async getPostFeed(req: Request, res: Response, next: NextFunction) {
    res.sendFile(path.resolve('.dist', 'client', 'pages', 'postFeed.html'));
  }

  public async getPostCreate(req: Request, res: Response, next: NextFunction) {
    res.sendFile(path.resolve('.dist', 'client', 'pages', 'createPost.html'));
  }

  public async getAllPostPreviews(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query = req.query.q as string;
      const userId = res.locals.userId as string;

      // Query exist, search posts
      if (query) {

        const posts: IPost[] = await this.searchDispatcher.search(query);
        const previews: IPostPreview[] =
          PostUtils.convertPostsToPostPreviews(posts);

        const previewsWithIsLiked: IPostPreview[] =
          await PostUtils.addIsLikedToPreviews(previews, userId);

        res.status(200).json({
          name: 'SearchCompleted',
          message: 'Post search completed.',
          payload: previewsWithIsLiked,
        } as ISuccess);
      } else {
        const posts: IPost[] = await Post.getAllPosts();

        const previews: IPostPreview[] =
          PostUtils.convertPostsToPostPreviews(posts);

        const previewsWithIsLiked: IPostPreview[] =
          await PostUtils.addIsLikedToPreviews(previews, userId);

        res.status(200).json({
          name: 'PostsFound',
          message: 'Posts found successfully',
          payload: previewsWithIsLiked,
        } as ISuccess);
      }
    } catch (err) {
      next(err);
    }
  }

  public async getPostPreviewsByUser(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.params.userId;
      const previews = await Post.getPreviewsByUserId(ownerId);
      const userId = res.locals.userId as string;
      const previewsWithIsLiked = await PostUtils.addIsLikedToPreviews(
        previews,
        userId
      );
      res.status(200).json({
        name: 'PostsFound',
        message: 'Posts found successfully',
        payload: previewsWithIsLiked,
      } as ISuccess);
    } catch (err) {
      next(err);
    }
  }

  public async getLikedPostPreviews(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = res.locals.userId as string;
      const previews = await Post.getLikedPostPreviews(userId);
      const previewsWithIsLiked = await PostUtils.addIsLikedToPreviews(
        previews,
        userId
      );
      res.status(200).json({
        name: 'PostsFound',
        message: 'Posts found successfully',
        payload: previewsWithIsLiked,
      } as ISuccess);
    } catch (err) {
      next(err);
    }
  }

  public async getPost(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.postId as string;
      const userId = res.locals.userId as string;
      const post: IPost | null = await Post.getPostById(postId);

      if (!post) {
        return res.status(404).json({
          type: 'ClientError',
          name: 'PostNotFound',
          message: 'Post not found',
        } as IAppError);
      }

      post.isLiked = !!(await PostUtils.getUserLikeIdForPost(postId, userId));

      return res.status(200).json({
        name: 'PostFound',
        message: 'Post found successfully',
        payload: post,
      } as ISuccess);
    } catch (err) {
      next(err);
    }
  }

  public async getPostComments(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const postId = req.params.postId;
      const comments: IComment[] = await Post.getPostCommentsByPostId(postId);

      return res.status(200).json({
        name: 'PostCommentsFound',
        message:
          comments.length > 0
            ? 'Post comments found successfully'
            : 'No post comments yet',
        payload: comments,
      } as ISuccess);
    } catch (err) {
      next(err);
    }
  }

  public async getUnviewedPostPreviews(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = res.locals.userId as string;
      const limit = req.query.limit as string;

      if (!userId) {
        return res.status(400).json({
          type: 'ClientError',
          name: 'MissingUserId',
          message: 'User ID is required',
        } as IAppError);
      }

      const postPreviews: IPostPreview[] = limit
        ? await Post.getUnViewedPostPreviews(userId, parseInt(limit))
        : await Post.getAllUnViewedPostPreviews(userId);

      if (postPreviews.length === 0) {
        return res.status(200).json({
          name: 'NoUnviewedPostPreviews',
          message: 'You have seen all the posts',
          payload: [],
        } as ISuccess);
      }

      const previewsWithIsLiked: IPostPreview[] =
        await PostUtils.addIsLikedToPreviews(postPreviews, userId);

      return res.status(200).json({
        name: 'PostPreviewsFound',
        message: 'Post previews found successfully',
        payload: previewsWithIsLiked,
      } as ISuccess);
    } catch (err) {
      next(err);
    }
  }

  public async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { biz_id, title, image_ids, owner_id, biz_rating, content } =
        req.body;
      const post = new Post({ biz_id, title, image_ids, owner_id, content });
      const savedPost = await post.save();
      await Business.addBusinessRatingById(biz_id, biz_rating);

      // Check if the owner is private
      const { visibility } = await Profile.getProfile(savedPost.owner_id);
      console.log('visibility', visibility);
      // emit postId to the room of the post owner
      if (visibility !== 'private') {
        Controller.io.to(savedPost.owner_id).emit('newPost', savedPost._id);
      }

      return res.status(201).json({
        name: 'PostCreated',
        message: 'Post created successfully',
        payload: savedPost,
      } as ISuccess);
    } catch (err) {
      next(err);
    }
  }

  public async updatePost(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.postId as string;
      const userId = res.locals.userId as string;
      const likeId = res.locals.likeId as string;
      const { comment, like } = req.body as IPostUpdate;

      if (comment !== undefined) {
        const commentToSave = new Comment({
          content: comment,
          post_id: postId,
          user_id: userId,
        } as IComment);
        await commentToSave.save();
      }

      if (like !== undefined) {
        if (like === true) {
          const likeToSave = new Like({
            post_id: postId,
            user_id: userId,
          } as ILike);
          await likeToSave.save();
        } else {
          await Like.deletePostLike(postId, likeId);
        }
      }

      return res.status(200).json({
        name: 'PostUpdated',
        message: 'Post updated successfully',
        payload: null,
      } as ISuccess);
    } catch (err) {
      next(err);
    }
  }

  public async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.postId;
      await Post.deletePostById(postId);
      return res.status(200).json({
        name: 'PostDeleted',
        message: 'Post deleted successfully',
      } as ISuccess);
    } catch (err) {
      next(err);
    }
  }

  private async validateDeletePermission(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const post = res.locals.post as IPost;
    const senderId = res.locals.userId as string;
    if (post.owner_id !== senderId) {
      return res.status(403).json({
        type: 'ClientError',
        name: 'ForbiddenRequest',
        message: 'You are not allowed to delete this post',
      } as IAppError);
    }
    next();
  }

  private async validatePostExists(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const postId = req.params.postId;
    const post: IPost | null = await Post.getPostById(postId);
    if (!post) {
      return res.status(404).json({
        type: 'ClientError',
        name: 'PostNotFound',
        message: 'Post not found',
      } as IAppError);
    }
    res.locals.post = post;
    next();
  }

  private validateCommentFormat(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { comment } = req.body;
    if (comment === undefined) {
      next();
      return;
    }

    if (comment.trim().length === 0) {
      return res.status(400).json({
        type: 'ClientError',
        name: 'InvalidComment',
        message: 'Cannot create empty comment',
      } as IAppError);
    }

    if (comment.length > 60) {
      return res.status(400).json({
        type: 'ClientError',
        name: 'InvalidComment',
        message: 'Comment cannot be longer than 60 characters',
      } as IAppError);
    }

    next();
  }

  private async validateLikeIdempotency(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { like } = req.body;
    if (like === undefined) {
      next();
      return;
    }

    const post = res.locals.post as IPost;
    const senderId = res.locals.userId as string;
    const postLikeId = await PostUtils.getUserLikeIdForPost(
      post._id!,
      senderId
    );

    if (like === true && postLikeId) {
      return res.status(400).json({
        type: 'ClientError',
        name: 'InvalidPostUpdate',
        message: 'You have already liked this post',
      } as IAppError);
    }

    if (like === false && !postLikeId) {
      return res.status(400).json({
        type: 'ClientError',
        name: 'InvalidPostUpdate',
        message: 'You cannot dislike a post that you have not liked',
      } as IAppError);
    }

    res.locals.likeId = postLikeId;

    next();
  }

  private validateRequiredFields(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { biz_id, title, image_ids, owner_id, biz_rating } = req.body;
    if (
      !biz_id ||
      !title ||
      !owner_id ||
      !image_ids ||
      !Array.isArray(image_ids) ||
      !biz_rating ||
      image_ids.length === 0
    ) {
      return res.status(400).json({
        type: 'ClientError',
        name: 'MissingRequiredFields',
        message: 'Missing required fields to create post',
      } as IAppError);
    }
    next();
  }

  private validateTitleFormat(req: Request, res: Response, next: NextFunction) {
    const { title } = req.body;
    if (title.length < 1 || title.length > 20) {
      return res.status(400).json({
        type: 'ClientError',
        name: 'InvalidTitle',
        message: `Title must be between 1 and 20 characters`,
      } as IAppError);
    }
    next();
  }

  private validateContentFormat(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { content } = req.body;
    if (content && content.length > 300) {
      return res.status(400).json({
        type: 'ClientError',
        name: 'InvalidContent',
        message: `Content cannot be longer than 300 characters`,
      } as IAppError);
    }
    next();
  }

  private validateBizRating(req: Request, res: Response, next: NextFunction) {
    const { biz_rating } = req.body;
    if (biz_rating < 1 || biz_rating > 5) {
      return res.status(400).json({
        type: 'ClientError',
        name: 'InvalidBizRating',
        message: 'Biz rating must be between 1 and 5',
      } as IAppError);
    }
    next();
  }

  private validateEmptyUpdate(req: Request, res: Response, next: NextFunction) {
    if (Object.keys(req.body).length === 0) {
      return res.status(200).json({
        name: 'NoUpdatesToPost',
        message: 'Nothing to update',
        payload: null,
      } as ISuccess);
    }
    next();
  }

  private async validateImageFormat(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (!req.file) {
      return res.status(400).json({
        type: 'ClientError',
        name: 'MissingImage',
        message: 'Image is required',
      } as IAppError);
    }

    try {
      const image = req.file;
      const validator = await ImageValidator.create(image.buffer);
      const error = validator.validate();

      if (error) {
        return res.status(400).json({
          type: 'ClientError',
          name: 'InvalidImage',
          message: error,
        } as IAppError);
      }
      next();
    } catch (error) {
      next(error);
    }
  }

  private async saveImage(req: Request, res: Response, next: NextFunction) {
    try {
      const image = req.file!;
      const blob = new Blob(image.buffer, image.mimetype);
      const savedBlob = await blob.save();

      return res.status(201).json({
        name: 'ImageSaved',
        message: 'Image saved successfully',
        payload: {
          _id: savedBlob._id,
        },
      } as ISuccess);
    } catch (err) {
      next(err);
    }
  }

  private async validateImageExists(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const imageId = req.params.imageId;
    const image: IBlob | null = await Blob.getBlob(imageId);
    if (!image) {
      return res.status(404).json({
        type: 'ClientError',
        name: 'ImageNotFound',
        message: 'Image not found',
      } as IAppError);
    }
    res.locals.image = image;
    next();
  }

  private async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      const imageId = req.params.imageId;
      await Blob.deleteBlob(imageId);
      return res.status(200).json({
        name: 'ImageDeleted',
        message: 'Image deleted successfully',
        payload: null,
      } as ISuccess);
    } catch (err) {
      next(err);
    }
  }
}
