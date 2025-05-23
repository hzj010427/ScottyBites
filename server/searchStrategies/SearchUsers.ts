import ISearchStrategy from "./ISearchStrategy";
import { User } from "../models/user.model";
import {IUser} from "../../common/user.interface";



export default class SearchUsers extends ISearchStrategy<IUser> {
    public constructor() {
        super();
    }
    public async searchInfo(query: string): Promise<IUser[]> {
        return await User.search(query);
    }
}

export { SearchUsers };