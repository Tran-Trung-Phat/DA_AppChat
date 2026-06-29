import api from "@/lib/axios";
import type { Story, StoryComment } from "@/types/chat";

export const storyService = {
  getStories: async () => {
    const res = await api.get<{ stories: Story[] }>("/stories");
    return res.data.stories;
  },

  createStory: async (formData: FormData) => {
    const res = await api.post<{ story: Story }>("/stories", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data.story;
  },

  viewStory: async (storyId: string) => {
    const res = await api.post(`/stories/${storyId}/view`);
    return res.data;
  },

  likeStory: async (storyId: string) => {
    const res = await api.post<{ likes: string[] }>(`/stories/${storyId}/like`);
    return res.data.likes;
  },

  commentStory: async (storyId: string, content: string) => {
    const res = await api.post<{ comment: StoryComment }>(
      `/stories/${storyId}/comment`,
      { content }
    );
    return res.data.comment;
  },

  deleteComment: async (storyId: string, commentId: string) => {
    await api.delete(`/stories/${storyId}/comment/${commentId}`);
  },
};
