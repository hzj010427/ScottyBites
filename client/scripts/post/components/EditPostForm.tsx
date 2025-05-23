import React, { useRef, useState } from 'react';
import { FaTimes, FaStar } from 'react-icons/fa';

import { FileItemProps } from '../interfaces/ui.post.interface';
import { uploadImage, deleteImage, uploadPost } from '../services/post.service';
import { IPost } from '../../../../common/post.interface';
import { IBusiness } from '../../../../common/business.interface';
import { showSuccessToast } from '../../utils/SuccessToast';
import { showAlertToast } from '../../utils/AlertToast';
import { handleAxiosError } from '../../utils/error.util';

const FileItem = ({ id, fileName, onRemove }: FileItemProps) => {
  return (
    <div
      className="d-flex align-items-center mb-2 border border-primary rounded p-1"
      id={id}
    >
      <span
        className="me-2"
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {fileName}
      </span>
      <button className="btn btn-sm btn-primary ms-auto" onClick={onRemove}>
        <FaTimes />
      </button>
    </div>
  );
};

const FileUploader = ({
  onImageIdsChange,
}: {
  onImageIdsChange: (ids: string[]) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<FileItemProps[]>([]);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const newFiles = Array.from(event.target.files || []);
      const totalFiles = files.length + newFiles.length;
      if (totalFiles > 8) {
        showAlertToast('You can only upload up to 8 images.');
        return;
      }

      const uploadedFiles = await Promise.all(
        newFiles.map((file) =>
          uploadImage(file).then((fileId) => ({
            id: fileId,
            fileName: file.name,
            onRemove: () => handleRemove(fileId),
          }))
        )
      );

      setFiles((prevFiles) => {
        const allFiles = [...prevFiles, ...uploadedFiles];
        onImageIdsChange(allFiles.map((file) => file.id));
        return allFiles;
      });
    } catch (error) {
      const errorMessage = handleAxiosError(error);
      showAlertToast(errorMessage);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await deleteImage(id);

      setFiles((prevFiles) => {
        const updatedFiles = prevFiles.filter((file) => file.id !== id);

        // Remove the file from the input
        if (fileInputRef.current) {
          const originalFileList = Array.from(fileInputRef.current.files || []);
          const dataTransfer = new DataTransfer();

          updatedFiles.forEach((file) => {
            const matchedFile = originalFileList.find(
              (f) => f.name === file.fileName
            );
            if (matchedFile) {
              dataTransfer.items.add(matchedFile);
            }
          });

          fileInputRef.current.files = dataTransfer.files;
        }

        // Update the imageIds
        onImageIdsChange(updatedFiles.map((file) => file.id));

        return updatedFiles;
      });
    } catch (error) {
      const errorMessage = handleAxiosError(error);
      showAlertToast(errorMessage);
    }
  };

  const handleRemoveAll = async () => {
    try {
      await Promise.all(files.map((file) => deleteImage(file.id)));
      setFiles([]);
      onImageIdsChange([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const errorMessage = handleAxiosError(error);
      showAlertToast(errorMessage);
    }
  };

  return (
    <div
      className={`mb-3 ms-3 me-3 p-4 border rounded shadow-sm ${files.length === 0 ? 'upload-container' : ''}`}
    >
      {files.length === 0 ? (
        <div
          style={{ cursor: 'pointer' }}
          onClick={handleUpload}
          className="d-flex flex-column align-items-center"
        >
          <i className="bi bi-cloud-upload" style={{ fontSize: '2rem' }}></i>
          <span>Upload Image*</span>
          <small className="form-text text-muted">
            At most 8 images (each less than 1000KB)
          </small>
          <small className="form-text text-muted">
            Supported formats: .jpg, .jpeg, .png, .webp, .bmp
          </small>
        </div>
      ) : (
        <div>
          {files.map((file, index) => (
            <FileItem
              key={index}
              id={file.id}
              fileName={file.fileName}
              onRemove={file.onRemove}
            />
          ))}
          <button className="btn btn-primary mt-3" onClick={handleRemoveAll}>
            Remove All
          </button>
        </div>
      )}
      <input
        type="file"
        className="form-control d-none"
        multiple
        ref={fileInputRef}
        accept=".jpg, .jpeg, .png, .webp, .bmp"
        onChange={handleFileChange}
      />
    </div>
  );
};

const StarRating = ({
  rating,
  setRating,
}: {
  rating: number;
  setRating: (rating: number) => void;
}) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="d-flex justify-content-center mb-3">
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <label key={index}>
            <input
              type="radio"
              name="rating"
              value={ratingValue}
              onClick={() => setRating(ratingValue)}
              style={{ display: 'none' }}
            />
            <FaStar
              size={60}
              color={
                ratingValue <= (hover || rating)
                  ? 'var(--primary-color)'
                  : '#e4e5e9'
              }
              onMouseEnter={() => setHover(ratingValue)}
              onMouseLeave={() => setHover(0)}
              style={{ cursor: 'pointer', transition: 'color 200ms' }}
            />
          </label>
        );
      })}
    </div>
  );
};

const EditPostForm = ({
  selectedBiz,
  onBack,
}: {
  selectedBiz: IBusiness | null;
  onBack: () => void;
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [bizScore, setBizScore] = useState(0);
  const postOwner = JSON.parse(localStorage.getItem('user') || '{}');

  const handleUploadPost = async () => {
    const post = {
      biz_id: selectedBiz?._id,
      owner_id: postOwner._id,
      title: title,
      content: content,
      image_ids: imageIds,
      biz_rating: bizScore,
    } as IPost;

    try {
      await uploadPost(post);
      showSuccessToast('Post created successfully', () => {
        window.location.href = '/post/pages/feed';
      });
    } catch (error) {
      const errorMessage = handleAxiosError(error);
      showAlertToast(errorMessage);
    }
  };

  return (
    <div className="text-center mt-4">
      <h4 className="mb-4 biz-name">Editing Post for: {selectedBiz?.name}</h4>

      {/* Upload Image */}
      <FileUploader onImageIdsChange={setImageIds} />

      {/* Title Input */}
      <div className="mb-3 ms-3 me-3 shadow-sm">
        <input
          type="text"
          className="form-control"
          placeholder="Add title*"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Content Input */}
      <div className="mb-3 ms-3 me-3 shadow-sm">
        <textarea
          className="form-control"
          placeholder="Add content"
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* Biz Rating */}
      <div className="mb-3">
        <h4 className="mb-2 biz-name">Please rate for: {selectedBiz?.name}</h4>
        <StarRating rating={bizScore} setRating={setBizScore} />
      </div>

      {/* Buttons */}
      <div className="d-flex justify-content-center gap-3">
        <button className="btn btn-outline-primary" onClick={onBack}>
          Back
        </button>
        <button className="btn btn-primary" onClick={handleUploadPost}>
          Post
        </button>
      </div>
    </div>
  );
};

export default EditPostForm;
