import { v4 as uuidV4 } from 'uuid';

import {
  IPost,
  IComment,
  ILike,
  IPostPreview,
} from '../../common/post.interface';
import DAC from '../db/dac';
import { sanitizeText } from '../utils/sanitizeText';
import { dropStopWords } from '../utils/searchUtils';

export class Post implements IPost {
  _id: string;

  comment_cnt: number;

  image_ids: string[];

  likes: number;

  owner_id: string;

  title: string;

  biz_id: string;

  content?: string;

  createdAt: Date;

  constructor(post: IPost) {
    this._id = post._id || uuidV4();
    this.createdAt = new Date();
    this.image_ids = post.image_ids;
    this.owner_id = post.owner_id;
    this.title = post.title;
    this.biz_id = post.biz_id;
    this.content = post.content || '';
    this.likes = 0;
    this.comment_cnt = 0;
  }

  async save(): Promise<IPost> {
    return await DAC.db.savePost(this);
  }

  static async getAllPosts(): Promise<IPost[]> {
    return await DAC.db.findAllPosts();
  }

  static async getPostById(postId: string): Promise<IPost | null> {
    return await DAC.db.findPostById(postId);
  }

  static async getPostCommentsByPostId(postId: string): Promise<IComment[]> {
    return await DAC.db.findCommentsByPostId(postId);
  }

  static async getPostLikesByPostId(postId: string): Promise<ILike[]> {
    return await DAC.db.findLikesByPostId(postId);
  }

  static async getUnViewedPostPreviews(
    userId: string,
    limit: number
  ): Promise<IPostPreview[]> {
    const postPreviews = await DAC.db.findUnviewedPostPreviews(userId, limit);
    await DAC.db.updatePostViews(
      userId,
      postPreviews.map((postPreview) => postPreview._id!)
    );
    return postPreviews;
  }

  static async getAllUnViewedPostPreviews(
    userId: string
  ): Promise<IPostPreview[]> {
    const postPreviews = await DAC.db.findAllUnViewedPostPreviews(userId);
    await DAC.db.updatePostViews(
      userId,
      postPreviews.map((postPreview) => postPreview._id!)
    );
    return postPreviews;
  }

  static async getPreviewsByUserId(userId: string): Promise<IPostPreview[]> {
    return await DAC.db.findPreviewsByUserId(userId);
  }

  static async getLikedPostPreviews(userId: string): Promise<IPostPreview[]> {
    return await DAC.db.findLikedPostPreviews(userId);
  }

  static async deletePostById(postId: string): Promise<void> {
    return await DAC.db.deletePostById(postId);
  }

  static async search(query: string) {
    const sanitizedQuery = dropStopWords(sanitizeText(query));
    return await DAC.db.searchPost(sanitizedQuery);
  }
}

export class Comment implements IComment {
  _id: string;

  content: string;

  post_id: string;

  user_id: string;

  createdAt: Date;

  constructor(comment: IComment) {
    this._id = uuidV4();
    this.createdAt = new Date();
    this.content = comment.content;
    this.post_id = comment.post_id;
    this.user_id = comment.user_id;
  }

  async save(): Promise<IComment> {
    return await DAC.db.saveComment(this);
  }

  static async getPostCommentsByPostId(postId: string): Promise<IComment[]> {
    return await DAC.db.findCommentsByPostId(postId);
  }
}

export class Like implements ILike {
  _id: string;

  post_id: string;

  user_id: string;

  createdAt: Date;

  constructor(like: ILike) {
    this._id = uuidV4();
    this.createdAt = new Date();
    this.post_id = like.post_id;
    this.user_id = like.user_id;
  }

  async save(): Promise<ILike> {
    return await DAC.db.saveLike(this);
  }

  static async getPostLikesByPostId(postId: string): Promise<ILike[] | null> {
    return await DAC.db.findLikesByPostId(postId);
  }

  static async deletePostLike(postId: string, likeId: string): Promise<void> {
    return await DAC.db.deletePostLike(postId, likeId);
  }
}
