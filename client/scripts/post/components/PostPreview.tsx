import React, { useState, useEffect } from 'react';
import { FaRegHeart, FaHeart } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';

import { IPostPreview } from '../../../../common/post.interface';
import {
  fetchImage,
  fetchUserNames,
  fetchUserAvatar,
  toggleLike,
} from '../services/post.service';
import { showAlertToast } from '../../utils/AlertToast';
import { handleAxiosError } from '../../utils/error.util';

export default function PostPreview({
  _id,
  image_id,
  owner_id,
  title,
  isLiked,
}: IPostPreview) {
  const [imageSrc, setImageSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [userAvatar, setUserAvatar] = useState('');
  const [userName, setUserName] = useState('');
  const [likeState, setLikeState] = useState(isLiked);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const src = await fetchImage(image_id);
        setImageSrc(src);
      } catch (error) {
        const errorMessage = handleAxiosError(error);
        showAlertToast(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [image_id]);

  useEffect(() => {
    const loadOwnerData = async () => {
      try {
        const [avatarSrc, userName] = await Promise.all([
          fetchUserAvatar(owner_id),
          fetchUserNames(owner_id),
        ]);

        setUserAvatar(avatarSrc);
        setUserName(userName);
      } catch (error) {
        const errorMessage = handleAxiosError(error);
        showAlertToast(errorMessage);
      }
    };

    loadOwnerData();
  }, [owner_id]);

  const handlePostClick = () => {
    window.location.href = `/post/pages/full/${_id}`;
  };

  const handleLikeClick = () => {
    setLikeState(!likeState);
    try {
      toggleLike(_id, !likeState);
    } catch (error) {
      const errorMessage = handleAxiosError(error);
      showAlertToast(errorMessage);
    }
  };

  const handleUserClick = () => {
    window.location.href = `/profile/pages/${owner_id}`;
  };

  return (
    <div
      className="card mb-4"
      style={{
        width: '12rem',
        transition: 'transform 0.2s ease-in-out',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {loading ? (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: '200px' }}
        >
          <ClipLoader size={50} color="var(--primary-color)" />
        </div>
      ) : (
        <img
          src={imageSrc}
          alt="Post"
          className="card-img-top"
          style={{ height: '200px', objectFit: 'cover', cursor: 'pointer' }}
          onClick={handlePostClick}
        />
      )}
      <div className="card-body px-2 py-2">
        <h6 className="fw-bold mb-2 text-truncate">{title}</h6>
        <div className="d-flex justify-content-between align-items-center text-muted">
          <div className="d-flex align-items-center" onClick={handleUserClick}>
            <img
              src={userAvatar}
              alt="avatar"
              className="rounded-circle me-1"
              width="16"
              height="16"
              style={{ cursor: 'pointer' }}
            />
            <small
              className="text-truncate"
              style={{ maxWidth: '70px', cursor: 'pointer' }}
            >
              {userName}
            </small>
          </div>
          <div className="d-flex align-items-center">
            {likeState ? (
              <FaHeart
                className="me-1 text-primary"
                onClick={handleLikeClick}
                style={{ cursor: 'pointer' }}
              />
            ) : (
              <FaRegHeart
                className="me-1"
                onClick={handleLikeClick}
                style={{ cursor: 'pointer' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
