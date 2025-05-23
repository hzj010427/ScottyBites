import React, { useState, useEffect } from 'react';
import { FaPlus, FaSyncAlt } from 'react-icons/fa';
import { createRoot } from 'react-dom/client';

import Header from './components/Header';
import OffCanvas from './components/OffCanvas';
import TooltipWrapper from './components/TooltipWrapper';
import PostPreview from './components/PostPreview';
import { fetchPostPreviews } from './services/post.service';
import { IPostPreview } from '../../../common/post.interface';
import { AlertToast } from '../utils/AlertToast';
import { SuccessToast } from '../utils/SuccessToast';
import SearchPostBar from './components/SearchPostBar';
const user = JSON.parse(localStorage.getItem('user') || '{}');

const Body = () => {
  const NUM_POSTS = 32 as const;

  const [previews, setPreviews] = useState<IPostPreview[]>([]);

  useEffect(() => {
    fetchPostPreviews(NUM_POSTS).then(setPreviews);
  }, []);

  return (
    <main className="post-gallery-main">
      {/* Search Bar */}
      <SearchPostBar setPreviews={setPreviews} />

      {/* Post Previews */}
      {previews.length > 0 ? (
        <div className="container py-4">
          <div className="row justify-content-center">
            {previews.map((post) => (
              <div
                key={post._id}
                className="col-6 col-sm-4 col-md-3 d-flex justify-content-center"
              >
                <PostPreview {...post} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="container py-4">
          <h4 className="text-center text-muted">
            You have seen all the posts! Click{' '}
            <a href="/post/pages/create" className="text-primary">
              here
            </a>{' '}
            to create your post!
          </h4>
        </div>
      )}
    </main>
  );
};

const Footer = () => {
  const handleCreatePost = () => {
    window.location.href = '/post/pages/create';
  };

  const handleMorePosts = () => {
    window.location.href = '/post/pages/feed';
  };

  return (
    <footer className="gallery-footer-container fixed-bottom d-flex align-items-center justify-content-center px-4 py-2">
      <TooltipWrapper helperTxt="Create Post">
        <button
          className="gallery-footer-btn btn btn-primary d-flex align-items-center justify-content-center"
          onClick={handleCreatePost}
        >
          <FaPlus color="white" />
        </button>
      </TooltipWrapper>

      <TooltipWrapper helperTxt="More Posts">
        <button
          className="gallery-footer-btn btn btn-primary d-flex align-items-center justify-content-center"
          onClick={handleMorePosts}
        >
          <FaSyncAlt color="white" />
        </button>
      </TooltipWrapper>
    </footer>
  );
};

function PostFeedPage() {
  return (
    <>
      <Header />
      <Body />
      <Footer />
      <OffCanvas userId={user._id} />
      <AlertToast />
      <SuccessToast />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<PostFeedPage />);
