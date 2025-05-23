import { IUser } from "../common/user.interface";

export interface ServerToClientEvents {
  allUsers: (users: IUser[]) => void;
  updatedUser: (user: IUser) => void;
  newPost: (postId: string) => void;
}

export interface ClientToServerEvents {
  ping: () => void;
}
