export interface IProfile {
  userId: string; // the user's unique id (foreign key)
  _id: string; // the profile's id
  picture: string; // the profile picture's id
  favoriteFoods: string[]; // the user's favorite foods, should enforce a maximum length of 3 items
  dietRestrictions: string[]; // the user's diet restrictions
  visibility: 'public' | 'private';
  followers: string[]; // the user's followers
}

export interface IUpdateProfile {
  favoriteFoods: string[];
  dietRestrictions: string[];
  visibility: 'public' | 'private';
}
