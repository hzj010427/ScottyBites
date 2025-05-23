export interface ILocation {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  }
  properties: {
    name: string;
    category: string[];
    address: string;
  };
}

export interface IMap {
  _id: string;
  location: ILocation;
}