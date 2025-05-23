export interface IAuth {
  email?: string;
  username: string;
  password: string;
}

export interface IVerification {
  email: string;
  username: string;
  OTP: string;
}

export interface IUser {
  credentials: IAuth;
  _id: string;
  online: boolean;
  agreedToTerms: boolean;
  verified: boolean;
  active: 'active' | 'inactive' | 'suspend';
  role: 'admin' | 'coordinator' | 'member';
}

export interface IUpdatedUser {
  email?: string;
  username?: string;
  password?: string;
  online?: boolean;
  agreedToTerms?: boolean;
  verified?: boolean;
  active?: 'active' | 'inactive' | 'suspend';
  role?: 'admin' | 'coordinator' | 'member';
}

export interface IJwtPayload {
  userId: string;
  password: string;
}

export interface IAuthenticatedUser {
  // when the user is authenticated through a login request, this is the response's payload
  user: IUser;
  token: string;
}
