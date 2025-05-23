// dao = Data Access Object
// This is the access point to the database
// It is used to decouple the database from the rest of the application
// It is accessed by the models, which are used by the controllers

import { IBusiness } from 'common/business.interface';
import { IUser } from '../../common/user.interface';
import { IBlob } from '../../common/blob.interface';
import { IProfile } from '../../common/profile.interface';
import { IPost, ILike, IComment, IPostPreview } from 'common/post.interface';
import { IMap } from 'common/map.interface';

export interface IDatabase {
  connect(): Promise<void>;

  init(): Promise<void>;

  close(): Promise<void>;

  cleanUp(): Promise<void>;

  /* User */
  saveUser(userData: IUser): Promise<IUser>;

  updateUser(userData: IUser): Promise<IUser>;

  findUserByUsername(username: string): Promise<IUser | null>;

  findUserByUserId(userId: string): Promise<IUser | null>;

  findAllUsers(): Promise<IUser[]>;

  /* Profile */
  findProfileByUserId(username: string): Promise<IProfile | null>;

  saveProfile(profile: IProfile): Promise<IProfile>;

  updateProfile(profile: IProfile): Promise<IProfile>;

  findAllFollowingIds(userId: string): Promise<string[]>;

  countLikesReceived(userId: string): Promise<number>;

  /* Account */
  findAllActiveAdmins(): Promise<IUser[]>;

  findReservedUsernames(): Promise<string[]>;

  /* Blob */
  saveBlob(blob: IBlob): Promise<IBlob>;

  findBlobById(blobId: string): Promise<IBlob | null>;

  updateBlob(blob: IBlob): Promise<IBlob>;

  deleteBlob(blobId: string): Promise<void>;

  /* Business */
  findBusinessById(businessId: string): Promise<IBusiness | null>;

  findBusinessAll(): Promise<IBusiness[]>;

  saveBusiness(businessData: IBusiness): Promise<IBusiness>;

  addBusinessRatingById(
    businessId: string,
    rating: number
  ): Promise<IBusiness | null>;

  /* Map */
  findMapById(mapId: string): Promise<IMap | null>;
  
  saveMap(mapData: IMap): Promise<IMap>;

  /* Search Info */
  searchBusiness(query: string): Promise<IBusiness[]>;

  searchUser(query: string): Promise<IUser[]>;

  searchPost(query: string): Promise<IPost[]>;

  /* Post */
  savePost(postData: IPost): Promise<IPost>;

  findAllPosts(): Promise<IPost[]>;

  findPostById(postId: string): Promise<IPost | null>;

  findCommentsByPostId(postId: string): Promise<IComment[]>;

  deletePostById(postId: string): Promise<void>;

  updatePostViews(userId: string, postIds: string[]): Promise<void>;

  findUnviewedPostPreviews(
    userId: string,
    limit: number
  ): Promise<IPostPreview[]>;

  findAllPostPreviews(): Promise<IPostPreview[]>;

  findPreviewsByUserId(userId: string): Promise<IPostPreview[]>;

  findLikedPostPreviews(userId: string): Promise<IPostPreview[]>;

  findAllUnViewedPostPreviews(userId: string): Promise<IPostPreview[]>;

  findLikesByPostId(postId: string): Promise<ILike[]>;

  saveComment(commentData: IComment): Promise<IComment>;

  saveLike(likeData: ILike): Promise<ILike>;

  deletePostLike(postId: string, likeId: string): Promise<void>;  findMapAll(): Promise<IMap[]>;
}

/* Data Access Class */
class DAC {
  static _db: IDatabase;

  static get db(): IDatabase {
    return DAC._db;
  }

  static set db(db: IDatabase) {
    DAC._db = db;
  }
}

export default DAC;
