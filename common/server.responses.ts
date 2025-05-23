import { IUser, IAuth, IAuthenticatedUser } from './user.interface';
import { IProfile } from './profile.interface';
import { IBusiness } from './business.interface';
import { IPostPreview } from './post.interface';
import { IComment } from './post.interface';
import { IPost } from './post.interface';

// in a response, the password property of an ILogin object should always be objustcated, e.g., replaced by '*******';

export interface IDirectory {
  onlineUserNames: string[];
  offlineUserNames: string[];
}

// ClientError is for errors that are caused by the client (4xx status code)
// ServerError is for errors that are caused by the server (5xx status code)
export type ErrorType = 'ClientError' | 'ServerError' | 'UnknownError';

export type SuccessName =
  | 'UserAuthenticated'
  | 'UserRegistered'
  | 'UserFound'
  | 'UsersFound'
  | 'ChatMessageCreated'
  | 'ChatMessageFound'
  | 'ChatMessagesFound'
  | 'UserUpdated'
  | 'NoChatMessagesYet'
  | 'NoUsersYet'
  | 'UserValidated'
  | 'UserVerified'
  | 'UserDeleted'
  | 'ProfileFound'
  | 'ProfileUpdated'
  | 'TotalLikesRetrieved'
  | 'SearchCompleted'
  | 'PostPreviewsFound'
  | 'NoUnviewedPostPreviews'
  | 'PostPreviewsFound'
  | 'PostFound'
  | 'PostsFound'
  | 'PostCommentsFound'
  | 'PostDeleted'
  | 'PostCreated'
  | 'PostUpdated'
  | 'NoUpdatesToPost'
  | 'ImageSaved'
  | 'ImageDeleted';

export type ClientErrorName =
  | 'MissingDisplayName'
  | 'MissingUsername'
  | 'MissingPassword'
  | 'MissingToken'
  | 'UnauthorizedRequest'
  | 'UserNotFound'
  | 'OrphanedChatMessage'
  | 'UserExists'
  | 'BusinessExists'
  | 'MapExists'
  | 'UnregisteredUser'
  | 'IncorrectPassword'
  | 'MissingChatText'
  | 'MissingAuthor'
  | 'MissingUserId'
  | 'InvalidUsername'
  | 'InvalidPassword'
  | 'InvalidEmail'
  | 'InvalidToken'
  | 'InvalidOTP'
  | 'InvalidVerification'
  | 'WeakPassword'
  | 'MissingField'
  | 'InvalidField'
  | 'UserInactive'
  | 'UserNotAgreedToTerms'
  | 'FailedUpdateAgreedToTerms'
  | 'FailedUpdateActiveStatus'
  | 'FailedUpdateOnlineStatus'
  | 'FailedUpdateRole'
  | 'FailedUpdateUsername'
  | 'FailedUpdatePassword'
  | 'ForbiddenRequest'
  | 'FailedUpdateEmail'
  | 'BlobNotFound'
  | 'NoFileUploaded'
  | 'FailedUpdateDisplayName'
  | 'ProfileNotFound'
  | 'ProfileExists'
  | 'PrivateProfile'
  | 'InvalidVisibility'
  | 'PostNotFound'
  | 'PostCommentsNotFound'
  | 'PostPreviewsNotFound'
  | 'MissingUserId'
  | 'MissingLimit'
  | 'InvalidTitle'
  | 'MissingRequiredFields'
  | 'InvalidComment'
  | 'InvalidContent'
  | 'InvalidPostUpdate'
  | 'FailedUpdatePostComment'
  | 'FailedUpdatePostLike'
  | 'NoLikesFound'
  | 'MissingImage'
  | 'ImageNotFound'
  | 'InvalidImage'
  | 'LikeNotFound'
  | 'InvalidRating'
  | 'InvalidBizRating';

export type ServerErrorName =
  | 'FailedAuthentication'
  | 'TokenError'
  | 'PostRequestFailure'
  | 'GetRequestFailure'
  | 'PatchRequestFailure'
  | 'InMemoryDBError'
  | 'FailedRegistration'
  | 'FailedTokenGeneration'
  | 'FailedSendEmail'
  | 'FailedGetUsers'
  | 'FailedUpdateUser'
  | 'FailedSanitizeText'
  | 'InvalidUpdateField'
  | 'MongoDBError'
  | 'FailedGetUserById'
  | 'FailedGetUserByUsername'
  | 'FailedGetUsernames'
  | 'UnknownError'
  | 'InvalidEmailType'
  | 'FailedGetAdmins'
  | 'FailedGetBusinessById'
  | 'FailedGetBusinessAll'
  | 'FailedSaveBusiness'
  | 'FailedGetMapById'
  | 'FailedGetMapAll'
  | 'FailedSaveMap'
  | 'FailedUpdateProfile'
  | 'FailedSearch'
  | 'FailedAddRatingById';

export type IPayload =
  | IUser
  | IAuth
  | IUser[]
  | string[]
  | string
  | IAuthenticatedUser
  | IDirectory
  | IProfile
  | number
  | IBusiness[]
  | IPostPreview[]
  | IComment[]
  | IPost
  | IPost[]
  | null;

export interface ISuccess {
  // a successful response (corresponding to 2xx status code)
  // name, message, authorizedUser are meta-data
  // the actual data returned is in payload property
  name: SuccessName; // name describing the action that succeeded
  message?: string; // an optional, informative message about the success condition
  authorizedUser?: string; // the username of the authorized user, for information purposes
  /* 
     payload is the actual data returned in the response;
     if there is no such data, payload should be set to null
  */
  payload: IPayload;
}

type AppErrorName = ClientErrorName | ServerErrorName;

export interface IAppError extends Error {
  type: ErrorType;
  name: AppErrorName;
  message: string;
}

// IResponse is the data type carried in a server response's body
// Note that it's a union type
// To be type-safe, let's specify a valid response body in terms of what it can be
export type IResponse = ISuccess | IAppError;

// Type guards to reduce a value of union type IResponse to a specific subtype.
// Use type guards or type assertions as needed and appropriate in your code when handling errors.

export function isAppError(res: IResponse): res is IAppError {
  return 'type' in res && 'name' in res && 'message' in res;
}

export function isSuccess(res: IResponse): res is ISuccess {
  if (!isAppError(res)) {
    return 'name' in res && 'payload' in res;
  }
  return false;
}

export function isServerError(res: IResponse) {
  if (isAppError(res)) return res.type == 'ServerError';
  return false;
}

export function isClientError(res: IResponse) {
  if (isAppError(res)) return res.type == 'ClientError';
  return false;
}

// See usage examples in trials/ts-eg/serverResponseTypes.ts
