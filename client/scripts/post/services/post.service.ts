import axios from 'axios';

import {
  IPost,
  IPostPreview,
  IComment,
} from '../../../../common/post.interface';
import { IBusiness } from '../../../../common/business.interface';
import { IUser } from '../../../../common/user.interface';

const token = localStorage.getItem('token');

export async function searchBusinesses(query: string): Promise<IBusiness[]> {
  const trimmedQuery = query.trim().toLowerCase();
  const response = await axios.get('/business/api/businesses', {
    params: { q: trimmedQuery },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.payload;
}

export async function searchPostPreviews(
  query: string
): Promise<IPostPreview[]> {
  const response = await axios.get('/post/api/previews', {
    params: { q: query },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.payload;
}

export async function fetchComments(postId: string): Promise<IComment[]> {
  const response = await axios.get(`/post/api/posts/${postId}/comments`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.payload;
}

export async function fetchPost(postId: string): Promise<IPost> {
  const response = await axios.get(`/post/api/posts/${postId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.payload;
}

export async function fetchImage(imageId: string): Promise<string> {
  const response = await axios.get(`/blob/${imageId}`, {
    responseType: 'blob',
  });

  const imageUrl = URL.createObjectURL(response.data);
  return imageUrl;
}

export async function fetchBusinessName(bizId: string): Promise<string> {
  const response = await axios.get(`/business/api/businesses/${bizId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.payload.name;
}

export async function fetchPostPreviews(
  limit: number
): Promise<IPostPreview[]> {
  const response = await axios.get('/post/api/unviewed-previews', {
    params: { limit },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.payload;
}

export async function fetchPostPreviewsByUser(
  userId: string
): Promise<IPostPreview[]> {
  const response = await axios.get(`/post/api/previews/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.payload;
}

export async function fetchLikedPostPreviews(): Promise<IPostPreview[]> {
  const response = await axios.get('/post/api/liked-previews', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.payload;
}

export async function fetchUserNames(userId: string): Promise<string> {
  const response = await axios.get(`/account/api/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = response.data.payload as IUser;
  return payload.credentials.username;
}

export async function fetchUserAvatar(userId: string): Promise<string> {
  const response = await axios.get(`/profile/api/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const avatarId = response.data.payload.picture;
  const avatar = await fetchImage(avatarId);
  return avatar;
}

export async function toggleLike(
  postId: string,
  isLiked: boolean
): Promise<void> {
  await axios.patch(
    `/post/api/posts/${postId}`,
    {
      like: isLiked,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export async function sendComment(
  postId: string,
  message: string
): Promise<void> {
  await axios.patch(
    `/post/api/posts/${postId}`,
    { comment: message },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export async function uploadPost(post: IPost): Promise<void> {
  await axios.post('/post/api/posts', post, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function deletePost(postId: string): Promise<void> {
  await axios.delete(`/post/api/posts/${postId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function uploadImage(image: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', image);

  const response = await axios.post('/post/api/images', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const imageId = response.data.payload._id;
  return imageId;
}

export async function deleteImage(imageId: string): Promise<void> {
  await axios.delete(`/post/api/images/${imageId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
