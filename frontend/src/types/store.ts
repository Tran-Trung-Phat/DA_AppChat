import type { User } from "./user";

export interface AuthState {
  accessToken: string | null;
  user: User | null;
  loading: boolean;

    setAccessToken: (accessToken: string) => void;
  clearState: () => void;
  signUp: (username:string, password:string, email:string, lastname:string, firstname:string) => Promise<boolean>;
  signIn: (username:string, password:string) => Promise<boolean>;
  signOut: () => Promise<void>;
  fetchMe: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (data: Partial<Pick<User, "displayName" | "email" | "bio" | "phone" | "avatarUrl">>) => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  googleSignIn: (credential: string) => Promise<boolean>;
  setUser: (user: User | null) => void;
}
