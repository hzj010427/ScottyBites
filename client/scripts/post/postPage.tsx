import React, { useState } from 'react';
import { BiSend } from 'react-icons/bi';
import { MdOutlineDeleteForever } from 'react-icons/md';
import { AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { FaRegComment } from 'react-icons/fa';
import { createRoot } from 'react-dom/client';
import axios from 'axios';

import {
  PostPageBodyProps,
  PostPageFooterProps,
} from './interfaces/ui.post.interface';
import { IPost } from '../../../common/post.interface';
import {
  fetchComments,
  fetchPost,
  fetchImage,
  fetchBusinessName,
  deletePost,
} from './services/post.service';
import Header from './components/Header';
import OffCanvas from './components/OffCanvas';
import TooltipWrapper from './components/TooltipWrapper';
import CommentOverlay from './components/CommentOverlay';
import ImageSlider from './components/ImageSlider';
import { toggleLike, sendComment } from './services/post.service';
import { IComment } from '../../../common/post.interface';
import { showAlertToast } from '../utils/AlertToast';
import { showSuccessToast, SuccessToast } from '../utils/SuccessToast';
import { AlertToast } from '../utils/AlertToast';
import { handleAxiosError } from '../utils/error.util';

const Body: React.FC<PostPageBodyProps> = ({
  showComments,
  setShowComments,
  post,
  businessName,
  images,
  comments,
}) => {
  return (
    <main className="post-main">
      <div className="d-flex flex-column py-4">
        <ImageSlider images={images} />

        <div className="d-flex flex-column px-4 py-4 gap-1">
          <h2 className="font-bold mb-2">{post?.title || 'Loading...'}</h2>
          <p
            className="text-gray-800 mb-2"
            style={{
              wordWrap: 'break-word',
              whiteSpace: 'normal',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {post?.content}
          </p>
          <div className="mb-2">
            {/* TODO: change to business page */}
            <a
              href={`/business/pages/${post?.biz_id}`}
              className="text-primary"
            >
              {'# ' + (businessName || 'Loading...')}
            </a>
          </div>
        </div>

        {showComments && (
          <CommentOverlay
            comments={comments}
            onClose={() => setShowComments(false)}
          />
        )}
      </div>
    </main>
  );
};

const Footer: React.FC<PostPageFooterProps> = ({
  postId,
  likeCount,
  commentCount,
  isLiked,
  isOwner,
  setCommentCount,
  setIsLiked,
  setLikeCount,
  setShowComments,
}) => {
  const handleLike = async () => {
    try {
      const newLikeState = !isLiked;
      await toggleLike(postId, newLikeState);
      setIsLiked(newLikeState);
      setLikeCount(likeCount + (newLikeState ? 1 : -1));
    } catch (error) {
      const errorMessage = handleAxiosError(error);
      showAlertToast(errorMessage);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost(postId);
      showSuccessToast('Post deleted successfully', () => {
        window.location.href = '/post/pages/feed';
      });
    } catch (error) {
      const errorMessage = handleAxiosError(error);
      showAlertToast(errorMessage);
    }
  };

  const handleSend = async () => {
    const inputElement = document.getElementById(
      'comment-input'
    ) as HTMLInputElement;
    const message = inputElement?.value.trim();

    if (!message) {
      showAlertToast('Cannot send empty comment');
      return;
    }

    try {
      await sendComment(postId, message);
      showSuccessToast('Comment sent successfully', () => {
        setCommentCount(commentCount + 1);
        inputElement.value = '';
      });
    } catch (error) {
      const errorMessage = handleAxiosError(error);
      showAlertToast(errorMessage);
      inputElement.value = '';
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <footer className="fixed-bottom d-flex bg-white align-items-center justify-content-center px-4 py-4">
      <div className="d-flex flex-row px-3 py-2 gap-4">
        <input
          type="text"
          id="comment-input"
          placeholder="Say something"
          className="form-control rounded-pill bg-light border-0 px-3 flex-grow-1"
          style={{ minWidth: 60 }}
          onKeyDown={handleKeyDown}
        />
        <div className="d-flex flex-row gap-3">
          <TooltipWrapper helperTxt="Send">
            <button
              className="btn btn-light rounded-circle p-2"
              onClick={handleSend}
            >
              <BiSend size={20} style={{ color: 'var(--primary-color)' }} />
            </button>
          </TooltipWrapper>
          {isOwner && (
            <TooltipWrapper helperTxt="Delete">
              <button
                className="btn btn-light rounded-circle p-2"
                onClick={handleDelete}
              >
                <MdOutlineDeleteForever
                  size={20}
                  style={{ color: 'var(--primary-color)' }}
                />
              </button>
            </TooltipWrapper>
          )}
          <TooltipWrapper helperTxt="Like">
            <button
              className="btn btn-light rounded-circle p-2"
              onClick={handleLike}
            >
              {isLiked ? (
                <AiFillHeart
                  size={20}
                  style={{ color: 'var(--primary-color)' }}
                />
              ) : (
                <AiOutlineHeart
                  size={20}
                  style={{ color: 'var(--primary-color)' }}
                />
              )}
              <span
                className="badge badge-primary position-absolute top-0 start-100 translate-middle"
                style={{ fontSize: '0.6rem' }}
              >
                {likeCount}
              </span>
            </button>
          </TooltipWrapper>
          <TooltipWrapper helperTxt="Comment">
            <button
              className="btn btn-light rounded-circle p-2"
              onClick={() => setShowComments(true)}
            >
              <FaRegComment
                size={18}
                style={{ color: 'var(--primary-color)' }}
              />
              <span
                className="badge badge-primary position-absolute top-0 start-100 translate-middle"
                style={{ fontSize: '0.6rem' }}
              >
                {commentCount}
              </span>
            </button>
          </TooltipWrapper>
        </div>
      </div>
    </footer>
  );
};

function PostPage() {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const [post, setPost] = useState<IPost | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const path = window.location.pathname;
  const pathSegments = path.split('/');
  const postId = pathSegments[pathSegments.length - 1];
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  React.useEffect(() => {
    const fetchPostData = async () => {
      try {
        const fetchedPost = await fetchPost(postId);
        setPost(fetchedPost);
        setLikeCount(fetchedPost.likes || 0);
        setCommentCount(fetchedPost.comment_cnt || 0);
        setIsLiked(fetchedPost.isLiked || false);
        setIsOwner(fetchedPost.owner_id === user._id);

        const fetchedBizName = await fetchBusinessName(fetchedPost.biz_id);
        setBusinessName(fetchedBizName);

        const fetchedImages = await Promise.all(
          fetchedPost.image_ids.map((imageId) => fetchImage(imageId))
        );
        setImages(fetchedImages);
      } catch (error) {
        const errorMessage = handleAxiosError(error);
        showAlertToast(errorMessage);
      }
    };

    fetchPostData();
  }, []);

  React.useEffect(() => {
    if (showComments) {
      document.body.style.overflow = 'hidden';
      fetchComments(postId).then((fetchedComments) => {
        setComments(fetchedComments);
      });
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [showComments]);

  return (
    <>
      <Header />
      <Body
        showComments={showComments}
        setShowComments={setShowComments}
        post={post}
        businessName={businessName}
        images={images}
        comments={comments}
      />
      <Footer
        postId={postId}
        likeCount={likeCount}
        commentCount={commentCount}
        isLiked={isLiked}
        isOwner={isOwner}
        setCommentCount={setCommentCount}
        setIsLiked={setIsLiked}
        setLikeCount={setLikeCount}
        setShowComments={setShowComments}
      />
      <OffCanvas userId={user._id} />
      <AlertToast />
      <SuccessToast />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<PostPage />);
