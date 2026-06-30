import api from '@/lib/axios'
import type { User } from '@/types/user';

type ProfilePayload = Partial<
  Pick<User, "displayName" | "email" | "bio" | "phone" | "avatarUrl">
>;

export const authService ={
  signUp: async (username: string, password: string, email: string, lastname: string, firstname: string) =>{
    const res = await api.post('/auth/signup', {
      username,
      password,
      email,
      lastName: lastname,
      firstName: firstname
    }, {withCredentials: true});
    return res.data;
  },

  signIn: async (username: string, password:string) =>{
    const res = await api.post('/auth/signin',{
      username,
      password
    }, {withCredentials: true});
    return res.data; // access token
  },

  signOut: async ()=>{
    return api.post("/auth/signout",{},{ withCredentials: true});
  },

  fetchMe: async () => {
    const res = await api.get("/users/me", {withCredentials: true});
    return res.data.user
  },

  updateProfile: async (data: ProfilePayload) => {
    const res = await api.patch<{ user: User }>("/users/me", data, {
      withCredentials: true,
    });
    return res.data.user;
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await api.post<{ user: User }>("/users/me/avatar", formData, {
      withCredentials: true,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data.user;
  },

  refresh: async () => {
    const res = await api.post("/auth/refresh", {}, {withCredentials: true})
    return res.data.accessToken;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.post("/auth/change-password", {
      currentPassword,
      newPassword,
    }, { withCredentials: true });
    return res.data;
  },

  forgotPassword: async (email: string) => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data;
  },

  resetPassword: async (token: string, email: string, newPassword: string) => {
    const res = await api.post("/auth/reset-password", {
      token,
      email,
      newPassword,
    });
    return res.data;
  },

  googleSignIn: async (credential: string) => {
    const res = await api.post("/auth/google", { credential }, { withCredentials: true });
    return res.data;
  },
}
