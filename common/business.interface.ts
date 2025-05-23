import { get } from "jquery";
import { IBlob } from "./blob.interface";

export interface IBusiness {
    _id: string;
    name: string;
    address: string;
    category: string[];
    description: string;
    phone?: string;
    email?: string;
    website?: string;
    picture: string;
    rating: number;
    numReviews: number;
}

export interface ICatalog {
    businesses: IBusiness[];
    hasMore: boolean;
}

