import React from 'react';
import { useState, useEffect } from 'react';
import PostPreview from '../../post/components/PostPreview';
import { IPostPreview } from '../../../../common/post.interface';
import {
  fetchPostPreviewsByUser,
  fetchLikedPostPreviews,
} from '../../post/services/post.service';

export default function PostSection({
  myId,
  userId,
  isPrivate,
}: {
  myId: string;
  userId: string;
  isPrivate: boolean;
}) {
  const [isLikedPage, setIsLikedPage] = useState(false); // liked page or posts page
  const [historyPostPreviews, setHistoryPostPreviews] = useState<
    IPostPreview[]
  >([]);
  const [likedPostPreviews, setLikedPostPreviews] = useState<IPostPreview[]>(
    []
  );

  useEffect(() => {
    fetchPostPreviewsByUser(userId).then(setHistoryPostPreviews);
    fetchLikedPostPreviews().then(setLikedPostPreviews);
  }, [userId, isLikedPage]);

  function HistoryPost() {
    if (historyPostPreviews.length > 0) {
      return (
        <div className="row justify-content-start">
          {historyPostPreviews.map((postPreview) => (
            <div
              className="col-6 col-md-4 d-flex justify-content-center"
              key={postPreview._id}
            >
              <PostPreview {...postPreview} />
            </div>
          ))}
        </div>
      );
    }
    return <p className="text-muted">You haven't posted any reviews yet.</p>;
  }

  function LikedPost() {
    if (likedPostPreviews.length > 0) {
      return (
        <div className="row justify-content-start">
          {likedPostPreviews.map((postPreview) => (
            <div
              className="col-6 col-md-4 d-flex justify-content-center"
              key={postPreview._id}
            >
              <PostPreview {...postPreview} />
            </div>
          ))}
        </div>
      );
    }
    return <p className="text-muted">You haven't liked any reviews yet.</p>;
  }

  return (
    <div className="row mt-4 mx-1">
      {/*Tabs - Fixed at top*/}
      <div
        className="position-sticky bg-white"
        style={{ top: '60px' }}
      >
        <nav className="nav d-flex justify-content-center">
          <a
            className={`nav-link ${isLikedPage ? 'text-muted' : ''}`}
            onClick={() => setIsLikedPage(false)}
            style={{ cursor: 'pointer' }}
          >
            Posts
          </a>
          {/*Only show liked page to one's own profile*/}
          {myId === userId && (
            <a
              className={`nav-link ${isLikedPage ? '' : 'text-muted'}`}
              onClick={() => setIsLikedPage(true)}
              style={{ cursor: 'pointer' }}
            >
              Liked
            </a>
          )}
        </nav>
        <hr className="mt-0" />
      </div>
      {/*Liked Posts or History Posts*/}
      <div className="col-12">
        {isLikedPage ? (
          <LikedPost />
        ) : isPrivate && myId !== userId ? (
          <p className="text-muted">Private Profile.</p>
        ) : (
          <HistoryPost />
        )}
      </div>
    </div>
  );
}
