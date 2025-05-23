import React, { useState, useEffect } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { AnimatePresence, motion } from 'framer-motion';
import { CommentOverlayProps } from '../interfaces/ui.post.interface';
import { fetchUserNames, fetchUserAvatar } from '../services/post.service';

const CommentOverlay: React.FC<CommentOverlayProps> = ({
  comments,
  onClose,
}) => {
  const [userNames, setUserNames] = useState<string[]>([]);
  const [userAvatars, setUserAvatars] = useState<string[]>([]);

  useEffect(() => {
    const fetchCommentSenderData = async () => {
      const names = await Promise.all(
        comments.map((comment) => fetchUserNames(comment.user_id))
      );
      const avatars = await Promise.all(
        comments.map((comment) => fetchUserAvatar(comment.user_id))
      );
      setUserNames(names);
      setUserAvatars(avatars);
    };

    fetchCommentSenderData();
  }, [comments]);

  return (
    <AnimatePresence>
      {/* comments panel with slide-in */}
      <motion.div
        className="comment-section position-absolute bottom-0 start-0 end-0 bg-white shadow-lg px-3 py-4"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* comment header */}
        <div className="d-flex justify-content-between mb-4">
          <h4 className="mb-0">Comments:</h4>
          <button
            className="btn btn-light p-1 rounded-circle"
            onClick={onClose}
          >
            <IoMdCloseCircleOutline size={24} color="#c41230" />
          </button>
        </div>

        {/* list of comments */}
        <ul className="list-unstyled">
          {comments.map((comment, index) => (
            <li key={index} className="d-flex align-items-start mb-3">
              <img
                src={userAvatars[index]}
                alt={userNames[index]}
                className="me-2 rounded-circle"
                style={{ width: '24px', height: '24px' }}
              />
              <span className="text-dark small">
                <strong>{userNames[index]}</strong>: {comment.content}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommentOverlay;
