export interface IComment {
    _id?: string;
    content: string;
    post_id: string;
    user_id: string;
    createdAt?: Date;
}

export interface ILike {
    _id?: string;
    post_id: string;
    user_id: string;
    createdAt?: Date;
}

export interface IPost {
    _id?: string;
    comment_cnt?: number;
    image_ids: string[];
    likes?: number;
    isLiked?: boolean;
    owner_id: string;
    biz_id: string;
    title: string;
    content?: string;
    biz_rating?: number;
    createdAt?: Date;
}

export interface IPostUpdate {
    comment?: string;
    like?: boolean;
}

export interface IPostPreview {
    _id: string;
    image_id: string; // the first image of post
    owner_id: string;
    title: string;
    isLiked: boolean;
}

export interface IPostNotification {
    _id: string;
    avatar_id: string;
    title: string;
    username: string;
}
