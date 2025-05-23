import { Schema, model } from 'mongoose';

import { IBusiness } from 'common/business.interface';
import { IMap } from 'common/map.interface';
import { IBlob } from '../../common/blob.interface';
import { IComment, ILike, IPost } from '../../common/post.interface';
import { IProfile } from '../../common/profile.interface';
import { IUser } from '../../common/user.interface';
import { defaultAvatarBuf } from '../assets/defaultAvatar';

const UserSchema = new Schema<IUser>({
  credentials: {
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: false },
  },
  _id: { type: String, required: true },
  online: { type: Boolean, default: false },
  agreedToTerms: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  active: {
    type: String,
    enum: ['active', 'inactive', 'suspend'],
    default: 'active',
  },
  role: {
    type: String,
    enum: ['admin', 'coordinator', 'member'],
    default: 'member',
  },
});


const ReservedUsernameSchema = new Schema({
  username: { type: String, required: true, unique: true },
});

const PostViewSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  viewedPostIds: { type: [String], default: [] },
});

const BlobSchema = new Schema<IBlob>({
  _id: { type: String, required: true },
  buf: { type: Buffer, default: defaultAvatarBuf },
  mimeType: { type: String, default: 'image/png' },
});

const ProfileSchema = new Schema<IProfile>({
  userId: { type: String, required: true },
  _id: { type: String, required: true },
  picture: { type: String, required: true },
  favoriteFoods: {
    type: [String],
    validate: {
      validator: (val: string[]) => val.length <= 3,
      message: 'favoriteFood array exceeds max length of 3',
    },
    default: [],
  },
  dietRestrictions: {
    type: [String],
    validate: {
      validator: (val: string[]) => val.length <= 6,
      message: 'dietRestrictions array exceeds max length of 6',
    },
    default: [],
  },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  followers: { type: [String], default: [] },
});

const BusinessSchema = new Schema<IBusiness>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  category: { type: [String], required: true },
  description: { type: String, required: false },
  phone: { type: String, required: false },
  email: { type: String, required: false },
  website: { type: String, required: false },
  picture: { type: String, required: true },
  rating: { type: Number, required: true },
  numReviews: { type: Number, required: true },
});


const PostSchema = new Schema<IPost>({
  _id: { type: String, required: true },
  comment_cnt: { type: Number, default: 0 },
  image_ids: { type: [String], required: true },
  likes: { type: Number, default: 0 },
  owner_id: { type: String, required: true },
  biz_id: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});


const CommentSchema = new Schema<IComment>({
  _id: { type: String, required: true },
  post_id: { type: String, required: true },
  user_id: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const LikeSchema = new Schema<ILike>({
  _id: { type: String, required: true },
  post_id: { type: String, required: true },
  user_id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const MapSchema = new Schema<IMap>({
  _id: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Feature'],
      required: true,
    },
    geometry: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number, Number],
        required: true,
      },
    },
    properties: {
      name: { type: String, required: true },
      category: { type: [String], required: true },
      address: { type: String, required: true },
    },
  },
});

// Indexing for full-text search on BusinessSchema
BusinessSchema.index({
  name: 'text',
  category: 'text',
  description: 'text',
});

// Indexing for full-text search on PostSchema
PostSchema.index({
  title: 'text',
  content: 'text',
});

// Indexing for full-text search on UserSchema
UserSchema.index({
  'credentials.username': 'text',
  'credentials.email': 'text',
});

const ReservedUsername = model('ReservedUsername', ReservedUsernameSchema);
const PostView = model('PostView', PostViewSchema);
const MUser = model<IUser>('User', UserSchema);
const MBusiness = model<IBusiness>('Business', BusinessSchema);
const MBlob = model<IBlob>('Blob', BlobSchema);
const MProfile = model<IProfile>('Profile', ProfileSchema);
const MPost = model<IPost>('Post', PostSchema);
const MComment = model<IComment>('Comment', CommentSchema);
const MLike = model<ILike>('Like', LikeSchema);
const MMap = model<IMap>('Map', MapSchema);

export {
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
};
