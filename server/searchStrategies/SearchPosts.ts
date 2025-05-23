import ISearchStrategy from "./ISearchStrategy";
import { IPost } from "../../common/post.interface";
import { Post } from "../models/post.model";



export default class SearchPosts extends ISearchStrategy<IPost> {
    public constructor() {
        super();
    }
    public async searchInfo(query: string): Promise<IPost[]> {
        return await Post.search(query);
    }
}

export { SearchPosts };