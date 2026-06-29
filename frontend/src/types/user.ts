export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  role: "user" | "admin";
  adminRole?: "super_admin" | "moderator" | "support";
  isActive: boolean;
  banReason?: string;
  reportCount?: number;
  messageCount?: number;
  createdAt?: string;
  updatedAt?: string

}
