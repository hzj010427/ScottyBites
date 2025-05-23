// an InMemory version of the database that you can use in early-stage development
// It's not persistent, but can be used for testing and debugging
// It allows you to evolve your application in the absense of a real database

import { IDatabase } from './dac';
import { IUser } from '../../common/user.interface';
import { IBusiness } from 'common/business.interface';
import { IAppError } from '../../common/server.responses';
import { reservedUsernames } from './reservedUsernames';
import { IProfile } from '../../common/profile.interface';
import { IBlob } from '../../common/blob.interface';
import { IPost, ILike, IComment, IPostPreview } from 'common/post.interface';
import { defaultAvatarBuf, defaultAvatarId } from '../assets/defaultAvatar';
import { PostUtils } from '../utils/postUtils';
import { IMap } from 'common/map.interface';

export class InMemoryDB implements IDatabase {
  private users: Map<string, IUser> = new Map();
  private profiles: Map<string, IProfile> = new Map();
  private businesses: Map<string, IBusiness> = new Map();
  private blobs: Map<string, IBlob> = new Map();
  private posts: Map<string, IPost> = new Map(); // post id -> post
  private comments: Map<string, IComment[]> = new Map(); // post id -> comments
  private likes: Map<string, ILike[]> = new Map(); // post id -> likes

  private postViews: Map<string, string[]> = new Map();
  private maps: Map<string, IMap> = new Map();

  async connect(): Promise<void> {
    // DO NOTHING
  }

  async init(): Promise<void> {
    this.users = new Map();

    // Add admin and test users
    const admin: IUser = {
      credentials: {
        username: 'admin',
        password:
          '$2b$10$7EoVzD0I3wKiSzfHjV1FsuCJXnfX67/BkUsL1M24pdTwQLTjMONQy', // admin
      },
      _id: 'admin',
      online: false,
      agreedToTerms: true,
      verified: true,
      active: 'active',
      role: 'admin',
    };

    const test: IUser = {
      credentials: {
        username: 'test',
        email: 'test@andrew.cmu.edu',
        password:
          '$2b$10$gAv0wCK8uZo8JS0BCXWrEe3d2GwU/Q6InYt.5SNHUm9pmvnisPavu', // test
      },
      _id: 'test',
      online: false,
      agreedToTerms: true,
      verified: true,
      active: 'active',
      role: 'member',
    };

    this.users.set(admin._id, admin);
    this.users.set(test._id, test);

    // Add admin and test profiles
    const adminProfile: IProfile = {
      userId: 'admin',
      _id: 'admin',
      picture: defaultAvatarId,
      favoriteFoods: ['pizza', 'burger', 'sushi'],
      dietRestrictions: [],
      visibility: 'public',
      followers: [],
    };

    const testProfile: IProfile = {
      userId: 'test',
      _id: 'test',
      picture: defaultAvatarId,
      favoriteFoods: [],
      dietRestrictions: [],
      visibility: 'public',
      followers: [],
    };

    this.profiles.set(adminProfile.userId, adminProfile);
    this.profiles.set(testProfile.userId, testProfile);
    await this.insertDefaultAvatar();
    // await this.insertTestBusiness();
  }

  async close(): Promise<void> {
    // DO NOTHING
  }

  private async insertTestBusiness(): Promise<void> {
    const testBusiness: IBusiness = {
      _id: 'test',
      name: 'Carnegie Mellon University',
      description: 'A good computer science university in Pittsburgh',
      address: '5000 Forbes Avenue',
      category: ['American'],
      phone: '123-456-7890',
      email: 'cmu@gmail.com',
      website: 'https://www.cmu.edu',
      picture: defaultAvatarId,
      rating: 4.5,
      numReviews: 100,
    };

    await this.saveBusiness(testBusiness);
  }

  private async insertDefaultAvatar(): Promise<void> {
    const avatarBlob: IBlob = {
      _id: defaultAvatarId,
      mimeType: 'image/png',
      buf: defaultAvatarBuf,
    };
    await this.saveBlob(avatarBlob);
  }

  async saveUser(user: IUser): Promise<IUser> {
    const userToSave: IUser = structuredClone(user);
    this.users.set(userToSave._id, userToSave);
    return structuredClone(userToSave);
  }

  async updateUser(user: IUser): Promise<IUser> {
    const userToUpdate = this.users.get(user._id);
    if (!userToUpdate) {
      throw {
        type: 'ClientError',
        name: 'UserNotFound',
        message: 'User not found',
      } as IAppError;
    }

    const updatedUser = { ...userToUpdate, ...user };
    this.users.set(user._id, updatedUser);
    return structuredClone(updatedUser);
  }

  async findUserByUsername(username: string): Promise<IUser | null> {
    for (const user of this.users.values()) {
      if (user.credentials.username === username) {
        return structuredClone(user);
      }
    }
    return null;
  }

  async findUserByUserId(userId: string): Promise<IUser | null> {
    const user = this.users.get(userId);
    return user ? structuredClone(user) : null;
  }

  async findAllUsers(): Promise<IUser[]> {
    return Array.from(this.users.values()).map((user) => structuredClone(user));
  }

  async findProfileByUserId(userId: string): Promise<IProfile | null> {
    const profile = this.profiles.get(userId);
    return profile ? structuredClone(profile) : null;
  }

  async saveProfile(profile: IProfile): Promise<IProfile> {
    const profileToSave: IProfile = structuredClone(profile);
    this.profiles.set(profile.userId, profileToSave);
    return structuredClone(profileToSave);
  }

  async updateProfile(profile: IProfile): Promise<IProfile> {
    const profileToUpdate = this.profiles.get(profile.userId);
    if (!profileToUpdate) {
      throw {
        type: 'ClientError',
        name: 'ProfileNotFound',
        message: 'Profile not found',
      } as IAppError;
    }
    this.profiles.set(profile.userId, profile);
    return structuredClone(profile);
  }

  async countLikesReceived(userId: string): Promise<number> {
    return Array.from(this.likes.values())
      .flat()
      .filter((like) => like.user_id === userId).length;
  }

  async findAllFollowingIds(userId: string): Promise<string[]> {
    return Array.from(this.profiles.values())
      .filter((profile) => profile.followers.includes(userId))
      .map((profile) => profile.userId);
  }

  async findAllActiveAdmins(): Promise<IUser[]> {
    return Array.from(this.users.values())
      .filter((user) => user.role === 'admin' && user.active === 'active')
      .map((user) => structuredClone(user));
  }

  async saveBlob(blob: IBlob): Promise<IBlob> {
    const blobToSave: IBlob = {
      ...blob,
      buf: blob.buf.toString('base64') as string,
    } as unknown as IBlob;
    this.blobs.set(blobToSave._id, blobToSave);
    return structuredClone(blobToSave);
  }

  async findBlobById(blobId: string): Promise<IBlob | null> {
    const blob = this.blobs.get(blobId);
    if (!blob) return null;

    return {
      ...blob,
      buf: Buffer.from(blob.buf as unknown as string, 'base64'),
    };
  }

  async updateBlob(blob: IBlob): Promise<IBlob> {
    const blobToUpdate = this.blobs.get(blob._id);
    if (!blobToUpdate) {
      throw {
        type: 'ClientError',
        name: 'BlobNotFound',
        message: 'Blob not found',
      } as IAppError;
    }

    const updatedBlob = { ...blobToUpdate, ...blob };
    this.blobs.set(blob._id, updatedBlob);
    return structuredClone(updatedBlob);
  }

  async deleteBlob(blobId: string): Promise<void> {
    this.blobs.delete(blobId);
  }

  async findReservedUsernames(): Promise<string[]> {
    return reservedUsernames;
  }

  async findBusinessById(businessId: string): Promise<IBusiness | null> {
    const business = this.businesses.get(businessId);
    return business ? structuredClone(business) : null;
  }

  async saveBusiness(businessData: IBusiness): Promise<IBusiness> {
    const businessToSave: IBusiness = structuredClone(businessData);
    this.businesses.set(businessToSave._id, businessToSave);
    return structuredClone(businessToSave);
  }

  async findBusinessAll(): Promise<IBusiness[]> {
    return Array.from(this.businesses.values()).map((business) =>
      structuredClone(business)
    );
  }

  async addBusinessRatingById(
    businessId: string,
    rating: number
  ): Promise<IBusiness | null> {
    const business = this.businesses.get(businessId);
    if (!business) {
      return null;
    }
    business.rating =
      (business.rating * business.numReviews + rating) / ++business.numReviews;
    this.businesses.set(business._id, business);
    return structuredClone(business);
  }

  // Search Info
  async searchBusiness(query: string): Promise<IBusiness[]> {
    if (!query || query === '') return [];

    try {
      return Array.from(this.businesses.values())
        .filter((business: IBusiness) =>
          query
            .toLowerCase()
            .split(' ')
            .some((word) => {
              return (
                business.name.toLowerCase().includes(word) ||
                business.description.toLowerCase().includes(word) ||
                business.category.some((cat) =>
                  cat.toLowerCase().includes(word)
                )
              );
            })
        )
        .map((business) => structuredClone(business));
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'FailedSearch',
        message: (error as Error).message,
      } as IAppError;
    }
  }

  async searchUser(query: string): Promise<IUser[]> {
    if (!query || query === '') return [];

    try {
      return Array.from(this.users.values())
        .filter((user: IUser) =>
          query
            .toLowerCase()
            .split(' ')
            .every((word) => {
              return (
                user.credentials.username.toLowerCase().includes(word) ||
                (user.credentials.email !== undefined &&
                  user.credentials.email.toLowerCase().includes(word))
              );
            })
        )
        .map((user) => structuredClone(user));
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'FailedSearch',
        message: (error as Error).message,
      } as IAppError;
    }
  }

  async searchPost(query: string): Promise<IPost[]> {
    if (!query || query === '') return [];

    try {
      return Array.from(this.posts.values())
        .filter((post: IPost) =>
          query
            .toLowerCase()
            .split(' ')
            .some((word) => {
              return (
                post.title.toLowerCase().includes(word) ||
                (post.content !== undefined &&
                  post.content.toLowerCase().includes(word))
              );
            })
        )
        .map((post) => structuredClone(post));
    } catch (error) {
      throw {
        type: 'ServerError',
        name: 'FailedSearch',
        message: (error as Error).message,
      } as IAppError;
    }
  }

  /* Post */

  async savePost(postData: IPost): Promise<IPost> {
    const postToSave: IPost = structuredClone(postData);
    this.posts.set(postToSave._id!, postToSave);
    return structuredClone(postToSave);
  }

  async findAllPosts(): Promise<IPost[]> {
    return Array.from(this.posts.values()).map((post) => structuredClone(post));
  }

  async findPostById(postId: string): Promise<IPost | null> {
    const post = this.posts.get(postId);
    return post ? structuredClone(post) : null;
  }

  async findCommentsByPostId(postId: string): Promise<IComment[]> {
    return this.comments.get(postId) || [];
  }

  async deletePostById(postId: string): Promise<void> {
    if (!this.posts.has(postId)) {
      throw {
        type: 'ClientError',
        name: 'PostNotFound',
        message: 'Cannot delete a non-existent post',
      } as IAppError;
    }
    this.comments.delete(postId);
    this.likes.delete(postId);
    this.posts.delete(postId);
  }

  async updatePostViews(userId: string, postIds: string[]): Promise<void> {
    const postViews = this.postViews.get(userId) || [];
    postViews.push(...postIds);
    this.postViews.set(userId, postViews);
  }

  async findUnviewedPostPreviews(
    userId: string,
    limit: number
  ): Promise<IPostPreview[]> {
    const allPostPreviews = await this.findAllPostPreviews();
    const viewedPostIds = this.postViews.get(userId) || [];
    const unviewedPostPreviews = allPostPreviews.filter(
      (postPreview) => !viewedPostIds.includes(postPreview._id!)
    );
    return unviewedPostPreviews.slice(0, limit);
  }

  async findAllUnViewedPostPreviews(userId: string): Promise<IPostPreview[]> {
    const allPostPreviews = await this.findAllPostPreviews();
    const viewedPostIds = this.postViews.get(userId) || [];
    const unviewedPostPreviews = allPostPreviews.filter(
      (postPreview) => !viewedPostIds.includes(postPreview._id!)
    );
    return unviewedPostPreviews;
  }

  async findAllPostPreviews(): Promise<IPostPreview[]> {
    return Array.from(this.posts.values()).map((post) =>
      PostUtils.convertPostToPostPreview(post)
    );
  }

  async findPreviewsByUserId(userId: string): Promise<IPostPreview[]> {
    return Array.from(this.posts.values())
      .filter((post) => post.owner_id === userId)
      .map((post) => PostUtils.convertPostToPostPreview(post));
  }

  async findLikedPostPreviews(userId: string): Promise<IPostPreview[]> {
    const likedIds = Array.from(this.likes.values())
      .flat()
      .filter((like) => like.user_id === userId)
      .map((like) => like.post_id);
    return Array.from(this.posts.values())
      .filter((post) => likedIds.includes(post._id!))
      .map((post) => PostUtils.convertPostToPostPreview(post));
  }

  async findLikesByPostId(postId: string): Promise<ILike[]> {
    return this.likes.get(postId) || [];
  }

  async saveComment(commentData: IComment): Promise<IComment> {
    const post = this.posts.get(commentData.post_id);
    if (!post) {
      throw {
        type: 'ClientError',
        name: 'PostNotFound',
        message: 'Cannot save comment to a non-existent post',
      } as IAppError;
    }

    post.comment_cnt!++;
    this.posts.set(post._id!, post);

    const commentToSave: IComment = structuredClone(commentData);
    const comments: IComment[] = this.comments.get(post._id!) || [];
    comments.push(commentToSave);
    this.comments.set(post._id!, comments);
    return structuredClone(commentToSave);
  }

  async saveLike(likeData: ILike): Promise<ILike> {
    const post = this.posts.get(likeData.post_id);
    if (!post) {
      throw {
        type: 'ClientError',
        name: 'PostNotFound',
        message: 'Cannot like a non-existent post',
      } as IAppError;
    }

    post.likes!++;
    this.posts.set(post._id!, post);

    const likeToSave: ILike = structuredClone(likeData);
    const likes: ILike[] = this.likes.get(post._id!) || [];
    likes.push(likeToSave);
    this.likes.set(post._id!, likes);
    return structuredClone(likeToSave);
  }

  async deletePostLike(postId: string, likeId: string): Promise<void> {
    const post = this.posts.get(postId);
    if (!post) {
      throw {
        type: 'ClientError',
        name: 'PostNotFound',
        message: 'Cannot unlike a non-existent post',
      } as IAppError;
    }

    post.likes!--;
    this.posts.set(post._id!, post);

    const likes: ILike[] = this.likes.get(post._id!) || [];
    const likeToDelete = likes.find((like) => like._id === likeId);
    if (!likeToDelete) {
      throw {
        type: 'ClientError',
        name: 'LikeNotFound',
        message: 'Cannot delete a non-existent like',
      } as IAppError;
    }
    likes.splice(likes.indexOf(likeToDelete), 1);
    this.likes.set(post._id!, likes);
  }

  async findMapById(mapId: string): Promise<IMap | null> {
    const map = this.maps.get(mapId);
    return map ? structuredClone(map) : null;
  }

  async findMapAll(): Promise<IMap[]> {
    return Array.from(this.maps.values()).map((map) => structuredClone(map));
  }

  async saveMap(mapData: IMap): Promise<IMap> {
    // Check if duplicate map ID
    if (this.maps.has(mapData._id)) {
      throw {
        type: 'ClientError',
        name: 'MapExists',
        message: 'Map already exists',
      } as IAppError;
    }

    // Save map
    const mapToSave: IMap = structuredClone(mapData);
    this.maps.set(mapToSave._id, mapToSave);
    return structuredClone(mapToSave);
  }

  async cleanUp(): Promise<void> {
    this.users.clear();
    this.businesses.clear();
    this.maps.clear();
    this.profiles.clear();
    this.blobs.clear();
    this.posts.clear();
    this.comments.clear();
    this.likes.clear();
    this.postViews.clear();
  }
}
