import ISearchStrategy from "./ISearchStrategy";
import { IBusiness } from "../../common/business.interface";
import { Business } from "../models/business.model";

export default class SearchBusinesses extends ISearchStrategy<IBusiness> {
    public constructor() {
        super();
    }
    public async searchInfo(query: string): Promise<IBusiness[]> {
        return await Business.search(query);
    }
}

export { SearchBusinesses };