// This is the real database, using MongoDB and Mongoose
// It can be initialized with a MongoDB URL pointing to a production or development/test database

import { IDatabase } from './dac';
import mongoose from 'mongoose';
import { IUser } from '../../common/user.interface';
import { IProfile } from '../../common/profile.interface';
import { IAppError } from '../../common/server.responses';
import { reservedUsernames } from './reservedUsernames';
import { IBusiness } from 'common/business.interface';
import { defaultAvatarBuf, defaultAvatarId } from '../assets/defaultAvatar';
import { cmuPictureBuf, cmuPictureId } from '../assets/cmuPicture';
import { laPrimaBuf, laPrimaId } from '../assets/laPrimaPicture';
import { IBlob } from '../../common/blob.interface';
import {
  IPost,
  IComment,
  ILike,
  IPostPreview,
} from '../../common/post.interface';
import { PostUtils } from '../utils/postUtils';
import { IMap } from 'common/map.interface';

import {
  MBlob,
  MBusiness,
  MComment,
  MLike,
  MMap,
  MPost,
  MProfile,
  MUser,
  PostView,
  ReservedUsername,
} from './mongoose.model';
import { Model } from 'mongoose';

export class MongoDB implements IDatabase {
  public dbURL: string;

  private db: mongoose.Connection | undefined;

  constructor(dbURL: string) {
    this.dbURL = dbURL;
  }

  private handleMongoError(error: unknown, customMessage?: string): never {
    throw {
      type: 'ServerError',
      name: 'MongoDBError',
      message: customMessage || (error as Error).message,
    } as IAppError;
  }

  async connect(): Promise<void> {
    try {
      await mongoose.connect(this.dbURL);
      this.db = mongoose.connection;
      console.log('⚡️[Server]: Connected to MongoDB');
    } catch (error) {
      console.error('⚡️[Server]: Error connecting to MongoDB:', error);
      throw error;
    }
  }

  async init(): Promise<void> {
    if (!this.db) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: 'Database not connected',
      } as IAppError;
    }
    console.log('⚡️[Server]: MongoDB initialized');

    await this.insertReservedUsernames();

    await this.insertAdminUser();

    await this.insertTestMember();

    await this.insertDefaultAvatar();

    // await this.prepopulateBusiness();

    // Create indexes for model
    await MUser.createIndexes();
    await MBusiness.createIndexes();
    await MPost.createIndexes();
  }

  async close(): Promise<void> {
    if (this.db) {
      await mongoose.disconnect();
      console.log('⚡️[Server]: Disconnected from MongoDB');
    }
  }

  /** User methods */

  async saveUser(user: IUser): Promise<IUser> {
    try {
      const existingUser = await MUser.findOne({ _id: user._id }).exec();
      if (existingUser) {
        throw {
          type: 'ClientError',
          name: 'UserExists',
          message: 'User already exists',
        } as IAppError;
      }

      const newUser = new MUser(user);
      const savedUser = await newUser.save();
      return savedUser.toObject();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async updateUser(userData: IUser): Promise<IUser> {
    try {
      const updatedUser = await MUser.findOneAndUpdate(
        { _id: userData._id },
        userData,
        { new: true }
      ).exec();

      if (!updatedUser) {
        throw {
          type: 'ClientError',
          name: 'UserNotFound',
          message: 'User not found',
        } as IAppError;
      }

      return updatedUser.toObject();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findUserByUsername(username: string): Promise<IUser | null> {
    try {
      const user = await MUser.findOne({
        'credentials.username': username,
      }).exec();
      return user ? user.toObject() : null;
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findUserByUserId(userId: string): Promise<IUser | null> {
    try {
      const user = await MUser.findOne({ _id: userId }).exec();
      return user ? user.toObject() : null;
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findAllUsers(): Promise<IUser[]> {
    try {
      const users = await MUser.find().exec();
      return users.map((user) => user.toObject());
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  /** Profile methods */

  async saveProfile(profile: IProfile): Promise<IProfile> {
    try {
      const existingProfile = await MProfile.findOne({
        userId: profile.userId,
      }).exec();
      if (existingProfile) {
        throw {
          type: 'ClientError',
          name: 'ProfileExists',
          message: 'Profile already exists',
        } as IAppError;
      }

      const newProfile = new MProfile(profile);
      const savedProfile = await newProfile.save();
      return savedProfile.toObject();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findProfileByUserId(userId: string): Promise<IProfile | null> {
    try {
      const profile = await MProfile.findOne({ userId }).exec();
      return profile ? profile.toObject() : null;
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: 'Error finding profile by userId',
      } as IAppError;
    }
  }

  async updateProfile(profile: IProfile): Promise<IProfile> {
    try {
      const updatedProfile = await MProfile.findOneAndUpdate(
        { userId: profile.userId },
        profile,
        { new: true }
      ).exec();
      if (!updatedProfile) {
        throw {
          type: 'ClientError',
          name: 'ProfileNotFound',
          message: 'Profile not found',
        } as IAppError;
      }
      return updatedProfile.toObject();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async countLikesReceived(userId: string): Promise<number> {
    try {
      // First find all posts by this user
      const userPosts = await MPost.find({ owner_id: userId }, { _id: 1 }).exec();
      const postIds = userPosts.map(post => post._id!);
      
      // Count likes using LikeSchema (MLike model)
      const likesCount = await MLike.countDocuments({
        post_id: { $in: postIds }
      }).exec();
      
      return likesCount;
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findAllFollowingIds(userId: string): Promise<string[]> {
    try {
      const profiles = await MProfile.find({ followers: userId }).exec();
      return profiles.map((profile) => profile.userId);
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findAllActiveAdmins(): Promise<IUser[]> {
    try {
      const admins = await MUser.find({
        role: 'admin',
        active: 'active',
      }).exec();
      return admins.map((admin) => admin.toObject());
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findReservedUsernames(): Promise<string[]> {
    try {
      const reserved = await ReservedUsername.find()
        .select('username -_id')
        .exec();
      return reserved.map((entry) => entry.username);
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async saveBlob(blob: IBlob): Promise<IBlob> {
    try {
      const newBlob = new MBlob(blob);
      const savedBlob = await newBlob.save();
      return savedBlob.toObject();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async updateBlob(blob: IBlob): Promise<IBlob> {
    try {
      const updatedBlob = await MBlob.findOneAndUpdate(
        { _id: blob._id },
        blob,
        { new: true }
      ).exec();
      if (!updatedBlob) {
        throw {
          message: 'Blob not found',
        };
      }
      return updatedBlob;
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async deleteBlob(blobId: string): Promise<void> {
    try {
      await MBlob.deleteOne({ _id: blobId }).exec();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findBlobById(blobId: string): Promise<IBlob | null> {
    try {
      return await MBlob.findOne({ _id: blobId }).exec();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  private async insertReservedUsernames(): Promise<void> {
    try {
      const count = await ReservedUsername.countDocuments();
      if (count === 0) {
        await ReservedUsername.insertMany(
          reservedUsernames.map((username) => ({ username }))
        );
        console.log('⚡️[Server]: Reserved usernames inserted into database');
      } else {
        console.log('⚡️[Server]: Reserved usernames already exist');
      }
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  private async insertAdminUser(): Promise<void> {
    try {
      const existingAdmin = await MUser.findOne({ _id: 'admin' }).exec();
      if (existingAdmin) {
        console.log('⚡️[Server]: Admin user already exists');
        return;
      }

      const admin: IUser = {
        credentials: {
          username: 'admin',
          password:
            '$2b$10$7EoVzD0I3wKiSzfHjV1FsuCJXnfX67/BkUsL1M24pdTwQLTjMONQy', // admin (hashed)
        },
        _id: 'admin',
        online: false,
        agreedToTerms: true,
        verified: true,
        active: 'active',
        role: 'admin',
      };

      const adminProfile: IProfile = {
        userId: 'admin',
        _id: 'admin',
        picture: defaultAvatarId,
        favoriteFoods: ['pizza', 'burger', 'sushi'],
        dietRestrictions: [],
        visibility: 'public',
        followers: [],
      };

      await new MUser(admin).save();
      await new MProfile(adminProfile).save();
      console.log('⚡️[Server]: Admin user and profile inserted into database');
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  private async insertTestMember(): Promise<void> {
    try {
      const existingMember = await MUser.findOne({ _id: 'test' }).exec();
      if (existingMember) {
        console.log('⚡️[Server]: Test member already exists');
        return;
      }

      const testMember: IUser = {
        credentials: {
          username: 'test',
          password:
            '$2b$10$gAv0wCK8uZo8JS0BCXWrEe3d2GwU/Q6InYt.5SNHUm9pmvnisPavu', // test (hashed)
        },
        _id: 'test',
        online: false,
        agreedToTerms: true,
        verified: true,
        active: 'active',
        role: 'member',
      };

      const testMemberProfile: IProfile = {
        userId: 'test',
        _id: 'test',
        picture: defaultAvatarId,
        favoriteFoods: ['dumplings', 'ramen', 'fried rice'],
        dietRestrictions: [],
        visibility: 'public',
        followers: [],
      };

      await new MUser(testMember).save();
      await new MProfile(testMemberProfile).save();
      console.log(
        '⚡️[Server]: Test member and profile inserted into database'
      );
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  private async insertDefaultAvatar(): Promise<void> {
    try {
      const existingAvatar = await MBlob.findOne({
        _id: defaultAvatarId,
      }).exec();
      if (existingAvatar) {
        console.log('⚡️[Server]: Default avatar already exists');
        return;
      }

      const defaultAvatarBlob: IBlob = {
        _id: defaultAvatarId,
        buf: defaultAvatarBuf,
        mimeType: 'image/png',
      };

      await new MBlob(defaultAvatarBlob).save();
      console.log('⚡️[Server]: Default avatar inserted into database');
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  private async prepopulateBusiness(): Promise<void> {
    const cmuBlob: IBlob = {
      _id: cmuPictureId,
      buf: cmuPictureBuf,
      mimeType: 'image/webp',
    };
    const laPrimaBlob: IBlob = {
      _id: laPrimaId,
      buf: laPrimaBuf,
      mimeType: 'image/png',
    };
    await this.saveBlob(cmuBlob);
    await this.saveBlob(laPrimaBlob);

    const carnegieMellon: IBusiness = {
      _id: 'CMU',
      name: 'Carnegie Mellon University',
      description: 'A good computer science university in Pittsburgh',
      address: '5000 Forbes Avenue',
      category: ['American'],
      phone: '(412)268-2000',
      website: 'https://www.cmu.edu',
      picture: cmuPictureId,
      rating: 5,
      numReviews: 1,
    };

    const cmuCafe: IBusiness = {
      _id: 'laPrima',
      name: 'La Prima Espresso',
      description: 'A good Coffee Shop on CMU campus',
      address: '5032 Forbes Avenue',
      category: ['American', 'Coffee Shop'],
      phone: '(412)268-8965',
      website: 'https://www.laprima.com',
      picture: laPrimaId,
      rating: 0,
      numReviews: 0,
    };

    await this.saveBusiness(carnegieMellon);
    await this.saveBusiness(cmuCafe);
  }

  /** Business methods */

  async findBusinessById(businessId: string): Promise<IBusiness | null> {
    try {
      return await MBusiness.findOne({ _id: businessId }).exec();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: 'Error finding Business by BusinessId',
      } as IAppError;
    }
  }

  async saveBusiness(business: IBusiness): Promise<IBusiness> {
    try {
      const existingBusiness = await MBusiness.findOne({
        _id: business._id,
      }).exec();
      if (existingBusiness) {
        throw {
          type: 'ClientError',
          name: 'BusinessExists',
          message: 'Business already exists',
        } as IAppError;
      }

      const newBusiness = new MBusiness(business);
      const savedBusiness = await newBusiness.save();
      return savedBusiness.toObject();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: 'Error saving Business',
      };
    }
  }

  async findBusinessAll(): Promise<IBusiness[]> {
    try {
      return await MBusiness.find().exec();
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'MongoDBError',
        message: 'Error finding all Businesses',
      };
    }
  }

  async addBusinessRatingById(
    businessId: string,
    rating: number
  ): Promise<IBusiness | null> {
    if (rating > 5 || rating < 1) {
      throw {
        type: 'ClientError',
        name: 'InvalidRating',
        message: 'Rating must be between 1 and 5',
      } as IAppError;
    }
    try {
      const existingBusiness = await MBusiness.findOne({
        _id: businessId,
      }).exec();
      if (!existingBusiness) {
        throw {
          type: 'ServerError',
          name: 'MongoDBError',
          message: 'Error finding Business by BusinessId',
        } as IAppError;
      }
      const newNumReviews = existingBusiness.numReviews + 1;
      const newRating =
        (existingBusiness.rating * existingBusiness.numReviews + rating) /
        newNumReviews;

      // Update the business with the new rating and number of reviews
      const updatedBusiness = await MBusiness.findOneAndUpdate(
        { _id: businessId },
        { rating: newRating, numReviews: newNumReviews },
        { new: true }
      ).exec();
      return updatedBusiness ? updatedBusiness.toObject() : null;
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findMapById(mapId: string): Promise<IMap | null> {
    try {
      const map = await MMap.findOne({ _id: mapId }).exec();
      return map ? map.toObject() : null;
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findMapAll(): Promise<IMap[]> {
    try {
      const maps = await MMap.find().exec();
      return maps.map((map) => map.toObject());
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async saveMap(map: IMap): Promise<IMap> {
    try {
      const existingMap = await MMap.findOne({ _id: map._id }).exec();
      if (existingMap) {
        throw {
          type: 'ClientError',
          name: 'MapExists',
          message: 'Map already exists',
        } as IAppError;
      }

      const newMap = new MMap(map);
      const savedMap = await newMap.save();
      return savedMap.toObject();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  /** Post methods */

  async savePost(postData: IPost): Promise<IPost> {
    try {
      const newPost = new MPost(postData);
      const savedPost = await newPost.save();
      return savedPost.toObject();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findAllPosts(): Promise<IPost[]> {
    try {
      return await MPost.find().exec();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findPostById(postId: string): Promise<IPost | null> {
    try {
      const post = await MPost.findOne({ _id: postId }).exec();
      return post ? post.toObject() : null;
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findCommentsByPostId(postId: string): Promise<IComment[]> {
    try {
      return await MComment.find({ post_id: postId }).exec();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async deletePostById(postId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await MPost.deleteOne({ _id: postId }, { session }).exec();
      // TODO: find all blobs associated with the post and delete them
      await MBlob.deleteMany({ post_id: postId }, { session }).exec();
      await MComment.deleteMany({ post_id: postId }, { session }).exec();
      await MLike.deleteMany({ post_id: postId }, { session }).exec();

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      this.handleMongoError(error);
    }
  }

  async updatePostViews(userId: string, postIds: string[]): Promise<void> {
    try {
      await PostView.updateOne(
        { userId },
        { $addToSet: { viewedPostIds: { $each: postIds } } },
        { upsert: true }
      ).exec();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findUnviewedPostPreviews(
    userId: string,
    limit: number
  ): Promise<IPostPreview[]> {
    try {
      const allPostPreviews = await this.findAllPostPreviews();
      const viewedPostsDoc = await PostView.findOne({ userId }).exec();
      if (!viewedPostsDoc) {
        return allPostPreviews;
      }

      const viewedPostIds = viewedPostsDoc.viewedPostIds;

      const unviewedPostPreviews = allPostPreviews.filter(
        (post) => !viewedPostIds.includes(post._id)
      );

      return unviewedPostPreviews.slice(0, limit);
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findAllUnViewedPostPreviews(userId: string): Promise<IPostPreview[]> {
    try {
      const allPostPreviews = await this.findAllPostPreviews();
      const viewedPostsDoc = await PostView.findOne({ userId }).exec();
      if (!viewedPostsDoc) {
        return allPostPreviews;
      }

      const viewedPostIds = viewedPostsDoc.viewedPostIds;

      const unviewedPostPreviews = allPostPreviews.filter(
        (post) => !viewedPostIds.includes(post._id)
      );
      return unviewedPostPreviews;
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findAllPostPreviews(): Promise<IPostPreview[]> {
    try {
      const posts = await MPost.find().exec();
      return posts.map((post) => PostUtils.convertPostToPostPreview(post));
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findPreviewsByUserId(userId: string): Promise<IPostPreview[]> {
    try {
      const posts = await MPost.find({ owner_id: userId }).exec();
      return posts.map((post) => PostUtils.convertPostToPostPreview(post));
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findLikedPostPreviews(userId: string): Promise<IPostPreview[]> {
    try {
      const likes = await MLike.find({ user_id: userId }).exec();
      const likeIds = likes.map((like) => like.post_id);
      const posts = await MPost.find({ _id: { $in: likeIds } }).exec();
      return posts.map((post) => PostUtils.convertPostToPostPreview(post));
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findLikesByPostId(postId: string): Promise<ILike[]> {
    try {
      return await MLike.find({ post_id: postId }).exec();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async saveComment(commentData: IComment): Promise<IComment> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const post = await MPost.findOneAndUpdate(
        { _id: commentData.post_id },
        { $inc: { comment_cnt: 1 } },
        { new: true }
      ).session(session);

      if (!post) {
        throw {
          type: 'ClientError',
          name: 'PostNotFound',
          message: 'Cannot save comment to a non-existent post',
        } as IAppError;
      }

      const newComment = new MComment(commentData);
      const savedComment = await newComment.save({ session });

      await session.commitTransaction();
      session.endSession();

      return savedComment.toObject();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleMongoError(error);
    }
  }

  async saveLike(likeData: ILike): Promise<ILike> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const post = await MPost.findOneAndUpdate(
        { _id: likeData.post_id },
        { $inc: { likes: 1 } },
        { new: true }
      ).session(session);

      if (!post) {
        throw {
          type: 'ClientError',
          name: 'PostNotFound',
          message: 'Cannot like a non-existent post',
        } as IAppError;
      }

      const newLike = new MLike(likeData);
      const savedLike = await newLike.save({ session });

      await session.commitTransaction();
      session.endSession();

      return savedLike.toObject();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleMongoError(error);
    }
  }

  async deletePostLike(postId: string, likeId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const post = await MPost.findOneAndUpdate(
        { _id: postId },
        { $inc: { likes: -1 } },
        { new: true }
      ).session(session);

      if (!post) {
        throw {
          type: 'ClientError',
          name: 'PostNotFound',
          message: 'Cannot unlike a non-existent post',
        } as IAppError;
      }

      const like = await MLike.findOne({ _id: likeId }).session(session);
      if (!like) {
        throw {
          type: 'ClientError',
          name: 'LikeNotFound',
          message: 'Cannot delete a non-existent like',
        } as IAppError;
      }

      await MLike.deleteOne({ _id: likeId }).session(session);

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      this.handleMongoError(error);
    }
  }

  // SearchInfo
  private async searchDocuments<T>(
    model: Model<T>,
    query: string
  ): Promise<T[]> {
    try {
      return await model.find({
        $text: { $search: query },
      });
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async searchBusiness(query: string): Promise<IBusiness[]> {
    return await this.searchDocuments(MBusiness, query);
  }

  async searchUser(query: string): Promise<IUser[]> {
    return await this.searchDocuments(MUser, query);
  }

  async searchPost(query: string): Promise<IPost[]> {
    return await this.searchDocuments(MPost, query);
  }

  // Cleanup
  async cleanUp(): Promise<void> {
    try {
      if (!this.db) {
        throw {
          type: 'ServerError',
          name: 'MongoDBError',
          message: 'Database not connected',
        } as IAppError;
      }

      const collections = this.db.collections;

      for (const collection of Object.values(collections)) {
        await collection.drop();
      }

      console.log('⚡️[Server]: All collections dropped, database cleaned up');
    } catch (error) {
      this.handleMongoError(error);
    }
  }
}
