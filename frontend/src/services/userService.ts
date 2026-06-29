import api from "@/lib/axios";
import type { UserSummary } from "@/types/chat";

export const userService = {
  searchUsers: async (query: string) => {
    const res = await api.get<{ users: UserSummary[] }>("/users", {
      params: { q: query },
    });
    return res.data.users;
  },
};
