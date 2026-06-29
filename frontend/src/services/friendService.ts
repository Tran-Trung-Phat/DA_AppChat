import api from "@/lib/axios";
import type { FriendRequest, UserSummary } from "@/types/chat";

export const friendService = {
  getFriends: async () => {
    const res = await api.get<{ friends: UserSummary[] }>("/friends");
    return res.data.friends;
  },

  getRequests: async () => {
    const res = await api.get<{
      sent: FriendRequest[];
      received: FriendRequest[];
    }>("/friends/requests");
    return res.data;
  },

  sendRequest: async (to: string, message?: string) => {
    const res = await api.post("/friends/request", { to, message });
    return res.data;
  },

  acceptRequest: async (requestId: string) => {
    const res = await api.post(`/friends/request/${requestId}/accept`);
    return res.data;
  },

  declineRequest: async (requestId: string) => {
    await api.post(`/friends/request/${requestId}/decline`);
  },
};
