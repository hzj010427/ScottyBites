import { IPost, IComment, IPostPreview } from '../../../../common/post.interface';
import { IBusiness } from '../../../../common/business.interface';
export interface PostPageBodyProps {
  showComments: boolean;
  setShowComments: React.Dispatch<React.SetStateAction<boolean>>;
  post: IPost | null;
  businessName: string | null;
  images: string[];
  comments: IComment[];
}

export interface PostPageFooterProps {
  postId: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isOwner: boolean;
  setCommentCount: React.Dispatch<React.SetStateAction<number>>;
  setIsLiked: React.Dispatch<React.SetStateAction<boolean>>;
  setLikeCount: React.Dispatch<React.SetStateAction<number>>;
  setShowComments: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface CommentOverlayProps {
  comments: IComment[];
  onClose: () => void;
}

export interface TooltipWrapperProps {
  helperTxt: string;
  children: React.ReactNode;
}

export interface ImageSliderProps {
  images: string[];
}

export type SearchAction =
  | { type: 'START_SEARCH' }
  | { type: 'FOUND' }
  | { type: 'NOT_FOUND' }
  | { type: 'SELECTED' }
  | { type: 'COMPLETED' }
  | { type: 'INITIALIZE' };

export interface SearchState {
  loading: boolean;
  found: boolean;
  notFound: boolean;
  selected: boolean;
}

export interface FindBizProps {
  selectedBiz: IBusiness | null;
  setSelectedBiz: (val: IBusiness | null) => void;
  onContinue: () => void;
}

export interface FindPostProps {
  setPreviews: (results: IPostPreview[]) => void;
}

export interface FileItemProps {
  id: string;
  fileName: string;
  onRemove: () => void;
}
