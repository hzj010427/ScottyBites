import { Post, Comment, Like } from '../../../server/models/post.model';
import DAC from '../../../server/db/dac';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import { isAppError } from '../../../common/server.responses';
import { stopWords } from '../../../server/utils/searchUtils';

describe('Post Model Tests', () => {
  describe('Post', () => {
    beforeAll(async () => {
      DAC.db = new InMemoryDB();
    });

    beforeEach(async () => {
      await DAC.db.init();

      // Prepopulate the in-memory DB with 60 posts
      for (let i = 0; i < 60; i++) {
        const post = new Post({
          _id: `post${i}`,
          image_ids: [`image${i}`],
          owner_id: `admin`,
          title: `Title ${i}`,
          biz_id: `biz${i}`,
        });

        // Comment and like for the post
        const comment = new Comment({
          content: `Comment for post ${i}`,
          post_id: `post${i}`,
          user_id: `admin`,
        });
        const like = new Like({
          post_id: `post${i}`,
          user_id: `admin`,
        });

        await post.save();
        await comment.save();
        await like.save();
      }
    });

    afterEach(async () => {
      await DAC.db.cleanUp();
    });

    test('should get x unviewed posts when limit is x', async () => {
      const posts1 = await Post.getUnViewedPostPreviews('admin', 1);
      const posts2 = await Post.getUnViewedPostPreviews('admin', 2);

      // Check if the number of posts and metadata are correct
      expect(posts1.length).toBe(1);
      expect(posts1[0]._id).toBe('post0');
      expect(posts1[0].title).toBe('Title 0');
      expect(posts1[0].owner_id).toBe('admin');

      expect(posts2.length).toBe(2);
      expect(posts2[0]._id).toBe('post1');
      expect(posts2[0].title).toBe('Title 1');
      expect(posts2[0].owner_id).toBe('admin');
      expect(posts2[1]._id).toBe('post2');
      expect(posts2[1].title).toBe('Title 2');
      expect(posts2[1].owner_id).toBe('admin');
    });

    test('should return no unviewed posts once the user has viewed them all', async () => {
      await Post.getUnViewedPostPreviews('admin', 10);
      await Post.getUnViewedPostPreviews('admin', 50);
      const postsToCheck = await Post.getUnViewedPostPreviews('admin', 1);

      // Check if there are no unviewed posts
      expect(postsToCheck.length).toBe(0);
    });

    test('should get all unviewed posts when limit is greater than the number of posts', async () => {
      const posts = await Post.getUnViewedPostPreviews('admin', 100);

      // Check if returns the correct number of posts when limit is greater than the number of posts
      expect(posts.length).toBe(60);
    });

    test('should delete all likes when a post is deleted', async () => {
      await Post.deletePostById('post1');

      // Check if all likes are deleted
      const likes = await Like.getPostLikesByPostId('post1');
      expect(likes!.length).toBe(0);
    });

    test('should delete all comments when a post is deleted', async () => {
      await Post.deletePostById('post1');

      // Check if all comments are deleted
      const comments = await Comment.getPostCommentsByPostId('post1');
      expect(comments!.length).toBe(0);
    });

    test('should increment the post like count when a like is created', async () => {
      const post = await Post.getPostById('post1');
      const like = new Like({
        post_id: post!._id!,
        user_id: `admin`,
      });
      await like.save();

      // Check if the like count and metadata are correct
      const postToCheck = await Post.getPostById('post1');
      const likesToCheck = await Like.getPostLikesByPostId('post1');
      expect(postToCheck!.likes).toBe(2);
      expect(likesToCheck!.length).toBe(2);
      expect(likesToCheck![0].user_id).toBe('admin');
      expect(likesToCheck![1].user_id).toBe('admin');
      expect(likesToCheck![0].post_id).toBe('post1');
      expect(likesToCheck![1].post_id).toBe('post1');
    });

    test('should decrement the post like count when a like is deleted', async () => {
      const post = await Post.getPostById('post1');
      const likes = await Like.getPostLikesByPostId('post1');
      await Like.deletePostLike(post!._id!, likes![0]._id!);

      // Check if the like count is decremented
      const postToCheck = await Post.getPostById('post1');
      const likesToCheck = await Like.getPostLikesByPostId('post1');
      expect(postToCheck!.likes).toBe(0);
      expect(likesToCheck!.length).toBe(0);
    });

    test('should increment the post comment count when a comment is created', async () => {
      const post = await Post.getPostById('post1');
      const comment = new Comment({
        post_id: post!._id!,
        user_id: `admin`,
        content: `Comment for post 1`,
      });
      await comment.save();

      // Check if the comment count is incremented
      const postToCheck = await Post.getPostById('post1');
      const commentsToCheck = await Comment.getPostCommentsByPostId('post1');
      expect(postToCheck!.comment_cnt).toBe(2);
      expect(commentsToCheck!.length).toBe(2);
      expect(commentsToCheck![0].user_id).toBe('admin');
      expect(commentsToCheck![1].user_id).toBe('admin');
      expect(commentsToCheck![0].post_id).toBe('post1');
      expect(commentsToCheck![1].post_id).toBe('post1');
    });

    test('should not comment on a non-existent post', async () => {
      try {
        const comment = new Comment({
          post_id: 'non-existent-post',
          user_id: `admin`,
          content: `Comment for non-existent post`,
        });
        await comment.save();
        throw new Error(
          'Should not save comment on non-existent post, but it did'
        );
      } catch (err) {
        if (isAppError(err)) {
          expect(err.type).toBe('ClientError');
          expect(err.name).toBe('PostNotFound');
          expect(err.message).toBe(
            'Cannot save comment to a non-existent post'
          );
        } else {
          throw err;
        }
      }
    });

    test('should not like a non-existent post', async () => {
      try {
        const like = new Like({
          post_id: 'non-existent-post',
          user_id: `admin`,
        });
        await like.save();
        throw new Error(
          'Should not save like on non-existent post, but it did'
        );
      } catch (err) {
        if (isAppError(err)) {
          expect(err.type).toBe('ClientError');
          expect(err.name).toBe('PostNotFound');
          expect(err.message).toBe('Cannot like a non-existent post');
        } else {
          throw err;
        }
      }
    });

    test('should not delete a non-existent post', async () => {
      try {
        await Post.deletePostById('non-existent-post');
        throw new Error('Should not delete non-existent post, but it did');
      } catch (err) {
        if (isAppError(err)) {
          expect(err.type).toBe('ClientError');
          expect(err.name).toBe('PostNotFound');
          expect(err.message).toBe('Cannot delete a non-existent post');
        } else {
          throw err;
        }
      }
    });
  });

  describe('Search Posts', () => {
    let post: Post;
    let post2: Post;
    beforeAll(async () => {
      DAC.db = new InMemoryDB();
      post = new Post({
        image_ids: ['image1.jpg'],
        owner_id: 'user_id',
        title: 'Test Post',
        content: 'content' + stopWords.join(' '),
        biz_id: 'business_id',
      });
      post2 = new Post({
        image_ids: ['image2.jpg'],
        owner_id: 'user_id',
        title: 'another post',
        content: 'another',
        biz_id: '2',
      });
      await post.save();
      await post2.save();
    });

    test('Should search for posts based on title', async () => {
      const results = await Post.search('Test');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(post);
    });

    test('Should search for posts based on content', async () => {
      const results = await Post.search('content');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(post);
    });

    test('Should search for post with partial match', async () => {
      const results = await Post.search('Test');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(post);
    });

    test('Should search multiple posts by title', async () => {
      const results = await Post.search('Post');
      expect(results).toHaveLength(2);
      expect(results).toEqual([post, post2]);
    });

    test('Should search multiple posts by content', async () => {
      const results = await Post.search('post');
      expect(results).toHaveLength(2);
      expect(results).toEqual([post, post2]);
    });

    test('Should not search stop words', async () => {
      const results = await Post.search(stopWords.join(' '));
      expect(results).toHaveLength(0);
    });
  });
});
