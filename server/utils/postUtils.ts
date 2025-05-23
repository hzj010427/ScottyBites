import { IPost, IPostPreview } from 'common/post.interface';

import { Post } from '../models/post.model';

export class PostUtils {
  public static convertPostToPostPreview(post: IPost): IPostPreview {
    return {
      _id: post._id!,
      title: post.title,
      image_id: post.image_ids[0],
      owner_id: post.owner_id,
      isLiked: post.isLiked ?? false,
    };
  }

  public static convertPostsToPostPreviews(posts: IPost[]): IPostPreview[] {
    return posts.map((post) => this.convertPostToPostPreview(post));
  }

  public static async getUserLikeIdForPost(
    postId: string,
    userId: string
  ): Promise<string | null> {
    const likes = await Post.getPostLikesByPostId(postId);
    const like = likes?.find((like) => like.user_id === userId);
    return like?._id ?? null;
  }

  public static async addIsLikedToPreviews(
    previews: IPostPreview[],
    userId: string
  ): Promise<IPostPreview[]> {
    return Promise.all(
      previews.map(async (preview) => {
        preview.isLiked = !!(await PostUtils.getUserLikeIdForPost(
          preview._id,
          userId
        ));
        return preview;
      })
    );
  }
}
