import type { User } from "./user";

export type UserSummary = Pick<
  User,
  "_id" | "username" | "displayName" | "email" | "avatarUrl"
>;

export interface FriendRequest {
  _id: string;
  from: UserSummary;
  to: UserSummary;
  message?: string;
  createdAt?: string;
}

export interface ConversationParticipant {
  _id?: string;
  displayName?: string;
  avatarUrl?: string;
  joinedAt?: string;
  userId?: UserSummary;
}

export interface LastMessage {
  _id?: string;
  content?: string;
  senderId?: UserSummary | string;
  createdAt?: string;
}

export interface Conversation {
  _id: string;
  type: "direct" | "group";
  participants: ConversationParticipant[];
  group?: {
    name?: string;
    createdBy?: string | UserSummary;
  };
  lastMessage?: LastMessage | null;
  lastMessageAt?: string;
  seenBy?: UserSummary[];
  unreadCounts?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
  status?: "active" | "locked" | "deleted";
  lockedReason?: string;
}

export interface MessageAttachment {
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  kind: "image" | "file";
}

export interface MessageLocationAddress {
  country?: string;
  city?: string;
  district?: string;
  ward?: string;
  road?: string;
  displayName?: string;
}

export interface MessageLocation {
  latitude: number;
  longitude: number;
  address?: MessageLocationAddress;
  mapUrl: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: UserSummary | string;
  type?: "text" | "location";
  content?: string;
  imgUrl?: string;
  attachments?: MessageAttachment[];
  location?: MessageLocation;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  status?: "active" | "locked" | "deleted";
  lockedReason?: string;
}
