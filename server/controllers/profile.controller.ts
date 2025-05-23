// Controller serving the profile-related resources

import Controller from './controller';
import { Request, Response, NextFunction } from 'express';
import { authorize } from '../middlewares/authorize';
import { Profile } from '../models/profile.model';
import { ProfileUtils } from '../utils/profileUtils';
import { IUpdateProfile } from '../../common/profile.interface';
import { IAppError, ISuccess } from '../../common/server.responses';

import path from 'path';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage });

export default class ProfileController extends Controller {
  public constructor(path: string) {
    super(path);
  }

  public initializeRoutes(): void {
    this.router.get('/pages/:userId', this.profilePage);
    this.router.use(authorize); // all routes below require authentication
    this.router.get('/api/:userId', this.getProfile);
    this.router.patch('/api/:userId', this.validateUserId, this.updateProfile);
    this.router.patch(
      '/api/:followeeId/followers/:userId',
      this.validateUserId,
      this.updateFollowingStatus
    );
    this.router.patch(
      '/api/:userId/picture',
      this.validateUserId,
      upload.single('picture'),
      this.updateProfilePicture
    );
    this.router.get('/api/:userId/likes-received', this.getTotalLikesReceived);
  }

  public async profilePage(req: Request, res: Response) {
    res.sendFile(path.resolve('.dist', 'client', 'pages', 'profile.html'));
  }

  private async validateUserId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // Check if the user ID is present in the request
    const userId: string = req.params.userId;
    if (!userId) {
      return res.status(400).json({
        type: 'ClientError',
        name: 'MissingUserId',
        message: 'User ID is missing',
      } as IAppError);
    }
    // Check if the user ID in the token matches the user ID in the request
    if (res.locals.userId !== userId) {
      return res.status(403).json({
        type: 'ClientError',
        name: 'UnauthorizedRequest',
        message: 'Unauthorized to update profile',
      } as IAppError);
    }
    next();
  }

  public async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId: string = req.params.userId;
      // get profile by user id
      const profile = await Profile.getProfile(userId);
      // Check visibility, if private, only the owner can see it
      if (profile.visibility === 'private' && res.locals.userId !== userId) {
        return res.status(403).json({
          type: 'ClientError',
          name: 'PrivateProfile',
          message: 'Profile is private',
        } as IAppError);
      }

      return res.status(200).json({
        name: 'ProfileFound',
        message: 'Profile found successfully',
        payload: profile,
      } as ISuccess);
    } catch (error) {
      next(error);
    }
  }

  public async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId: string = req.params.userId;
      const updates = req.body as IUpdateProfile;
      const profile = await Profile.getProfile(userId);
      const appliedProfile = ProfileUtils.applyFieldUpdates(profile, updates);
      const updatedProfile = await Profile.updateProfile(appliedProfile);

      return res.status(200).json({
        name: 'ProfileUpdated',
        message: 'Profile updated successfully',
        payload: updatedProfile,
      } as ISuccess);
    } catch (error) {
      next(error);
    }
  }

  public async updateFollowingStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const [followerId, followeeId] = [
        req.params.userId,
        req.params.followeeId,
      ];

      const profile = await Profile.getProfile(followeeId);
      // Check profile visibility
      if (
        profile.visibility === 'private' &&
        res.locals.userId !== followeeId
      ) {
        return res.status(403).json({
          type: 'ClientError',
          name: 'PrivateProfile',
          message: 'Profile is private',
        } as IAppError);
      }
      const appliedProfile = ProfileUtils.applyFollower(profile, followerId);
      const updatedProfile = await Profile.updateProfile(appliedProfile);

      return res.status(200).json({
        name: 'ProfileUpdated',
        message: 'Following status updated successfully',
        payload: updatedProfile,
      } as ISuccess);
    } catch (error) {
      next(error);
    }
  }

  public async updateProfilePicture(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Access the file loaded by multer
      if (!req.file) {
        return res.status(400).json({
          type: 'ClientError',
          name: 'FailedUpdateProfile',
          message: 'No profile picture provided',
        } as IAppError);
      }
      
      // req.file.buffer is the binary content of the image.
      // Convert to base64 string if your ProfileUtils.applyPicture expects a string.
      // const pictureBase64 = req.file.buffer.toString('base64');
      const profile = await Profile.getProfile(res.locals.userId);
      const appliedProfile = await ProfileUtils.applyPicture(profile, req.file.buffer, req.file.originalname);
      const updatedProfile = await Profile.updateProfile(appliedProfile);

      return res.status(200).json({
        name: 'ProfileUpdated',
        message: 'Profile picture updated successfully',
        payload: updatedProfile,
      } as ISuccess);
    } catch (error) {
      next(error);
    }
  }

  public async getTotalLikesReceived(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId;
      const totalLikes = await Profile.getTotalLikesReceived(userId);
      res.status(200).json({
        name: 'TotalLikesRetrieved',
        message: 'Total likes received retrieved successfully',
        payload: totalLikes,
      } as ISuccess);
    } catch (error) {
      next(error);
    }
  }
}
