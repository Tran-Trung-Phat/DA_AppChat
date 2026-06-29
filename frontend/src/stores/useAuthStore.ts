import { create } from "zustand";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import type { AuthState } from "@/types/store";

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  user: null,
  loading: false,

  setAccessToken: (accessToken) => {
    set({ accessToken });
  },

  clearState: () => {
    set({ accessToken: null, user: null, loading: false });
  },

  signUp: async (username, password, email, lastname, firstname) => {
    try {
      set({ loading: true });
      await authService.signUp(username, password, email, lastname, firstname);
      toast.success("Đăng ký thành công. Bạn có thể đăng nhập ngay.");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Đăng ký không thành công");
      return false;
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (username, password) => {
    try {
      set({ loading: true });
      const { accessToken } = await authService.signIn(username, password);

      get().setAccessToken(accessToken);
      await get().fetchMe();

      toast.success("Chào mừng bạn quay lại với Moji");
      return true;
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Đăng nhập không thành công");
      return false;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      get().clearState();
      await authService.signOut();
      toast.success("Đăng xuất thành công");
    } catch (error) {
      console.log(error);
      toast.error("Lỗi xảy ra khi đăng xuất. Hãy thử lại");
    }
  },

  fetchMe: async () => {
    try {
      set({ loading: true });
      const user = await authService.fetchMe();
      set({ user });
    } catch (error) {
      console.error(error);
      set({ user: null, accessToken: null });
      toast.error("Không thể lấy dữ liệu người dùng");
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (data) => {
    try {
      set({ loading: true });
      const user = await authService.updateProfile(data);
      set({ user });
      toast.success("Cập nhật thông tin thành công");
      return true;
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Không thể cập nhật thông tin");
      return false;
    } finally {
      set({ loading: false });
    }
  },

  uploadAvatar: async (file) => {
    try {
      set({ loading: true });
      const user = await authService.uploadAvatar(file);
      set({ user });
      toast.success("Cập nhật ảnh đại diện thành công");
      return true;
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Không thể upload ảnh đại diện");
      return false;
    } finally {
      set({ loading: false });
    }
  },

  refresh: async () => {
    try {
      set({ loading: true });
      const { user, fetchMe, setAccessToken } = get();
      const accessToken = await authService.refresh();

      setAccessToken(accessToken);

      if (!user) {
        await fetchMe();
      }
    } catch (error) {
      console.error(error);
      get().clearState();
    } finally {
      set({ loading: false });
    }
  },
}));
