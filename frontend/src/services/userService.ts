import api from "@/lib/axios";
import type { UserSummary, Story } from "@/types/chat";
import type { User } from "@/types/user";

export interface UserProfileResponse {
  user: User;
  posts: Story[];
  friends: UserSummary[];
  totalFriends: number;
  friendshipStatus: "none" | "sent" | "received" | "friends" | "blocked";
}

export const userService = {
  searchUsers: async (query: string) => {
    const res = await api.get<{ users: UserSummary[] }>("/users", {
      params: { q: query },
    });
    return res.data.users;
  },

  getUserProfile: async (userId: string) => {
    const res = await api.get<UserProfileResponse>(`/users/profile/${userId}`);
    return res.data;
  },

  uploadCover: async (formData: FormData) => {
    const res = await api.post<{ user: User }>("/users/me/cover", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.user;
  },
};
